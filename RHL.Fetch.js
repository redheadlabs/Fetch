
  /*/-----------------------------/*/
 /*/ --- RHL Fetch --------------/*/
/*/-----------------------------/*/

;( function( RHLApp, window, document, $, undefined ){

	"use strict";

	var data = {
			requests: {}
		},
		defaults = {
			debug: false,
			cache: true,
			autoRun: false,
			replaceContents: false,
			nMaxResults: 1,
			url: config.ShopPath,
			context: '[data-rhl-fetch="place"]', //Where the result goes
			contextRemote: '[data-rhl-fetch="fetch"]', //Where the result comes from
			template: '[type="text/template"]'
		}

	var Fetch = function( options ){

		var settings = $.extend({}, defaults, options),
			instance = NewInstance( this );
			instance.settings = settings
			instance.init()
	}
	//User can redefine these
	Fetch.prototype.applyTemplate = function(){ return item || null }
	Fetch.prototype.onSuccess = function(){ return this }
	Fetch.prototype.onFail = function(){ return this }
	Fetch.prototype.afterLoad = function(){ return this }
	Fetch.prototype.afterLazyLoad = function(){ return this }
	Fetch.prototype.init = function(){

		if( this.settings.autoRun === true )
			return this.run()

		return this
	}
	Fetch.prototype.run = function( url, context ){

		var instance = this,
			url = url || this.settings.url,
			keyCache = window.btoa( url ),
			content = context || this.settings.context,
			req = instance.fetch( url ).then( function( results ){

				instance.format( results ).then( function( newContents ){

					instance.log({
						Status: 200,
						HTML: newContents.html()
					}, 'cache', keyCache)

					instance.exportData()

					instance.lazyLoad( instance.settings.context, function(){

						instance.afterLazyLoad()
					})

					instance.afterLoad( newContents )

				}).catch( function( err ){

					instance.log( err, 'error' )
				})
			}).catch( function( err ){

				instance.log( err, 'error' )
			})
	}
	Fetch.prototype.fetch = function( url ){

		var instance = this,
			url = url || instance.settings.url,
			keyCache = window.btoa( url ),
			promise = new Promise( function( resolve, reject ){

				instance.urlExists( url, function( bExists ){

					if( bExists === false ){

						var strErrorMessage = 'Page `' + url + '` Does Not Exist.'

						instance.log({
							Status: 404,
							ErrorThrown: strErrorMessage
						}, 'cache', keyCache)

						reject('RHLFetch Error: ' + strErrorMessage + ' Skipping')
					}else{

						$.ajax({
							url: url,
							async: true,
							cache: true,
							error: function( xhr, textStatus, errorThrown ){

								instance.log({
									Status: xhr.status,
									ErrorThrown: errorThrown
								}, 'cache', keyCache)

								instance.onFail()

								reject('Page Not Found: ' + errorThrown)
							}
						}).done( function( results, textStatus, jqXHR ){

							var $results = $( results ).find( instance.settings.contextRemote )

							if( $results.length !== 0 ){
								//Log the result after format to cache live content
								instance.onSuccess()

								resolve( $results )
							}else{

								instance.log({
									Status: jqXHR.status,
									ErrorThrown: url + ' - No Results'
								}, 'cache', keyCache)

								instance.onFail()

								reject('No Results')
							}
						})
					}
				})
			})

		return promise
	},
	Fetch.prototype.importData = function(){

		this.log( data, 'dir')

		var objCookieBadRequests = {}

		$.each( objCookieBadRequests, function( key, val ){

			this.data[ key ] = val
		})
		return data
	}
	Fetch.prototype.exportData = function( objRequests ){

		var objRequests = data.requests || objRequests,
			cookieOptions = { expires: 4, path: '/' }

		$.each( data.requests, function( key, val ){

			switch( val.Status ){
				case 404:
				case 403:

					Cookies.set('RHLFetchBadRequests_' + key, val.ErrorThrown, cookieOptions)

					break;
				case 200:

					Cookies.set('RHLFetchRequests_' + key, val.Status, cookieOptions);

					break;
			}
		})

		return data
	}
	Fetch.prototype.format = function( $results ){

		if( $results.length === 0 ) return false

		var instance = this,
			hasTemplate = $( instance.settings.template ).length !== 0,
			promise = new Promise( function( resolve, reject ){

				var $resultItems = instance.settings.nMaxResults !== 0 ? $results.slice(0, instance.settings.nMaxResults) : $results,
					nResults = $resultItems.length || 0

				if( nResults === 0 )
					resolve( $resultItems )

				$resultItems.each( function( idx, content ){

					var nth = idx + 1,
						elem = hasTemplate ? instance.settings.template : content,
						$template = $('<div />').html( $( elem ).html() )

					instance.UpdateView( $template.html(), content )

					if( nth === nResults )
						resolve( $template )
				})
			})

		return promise
	}
	Fetch.prototype.UpdateView = function( $template, content ){

		var templateData = this.applyTemplate( content ),
			$context = $( this.settings.context )

		$context.css({opacity: '0', visibility: 'hidden'})

		this.log( $context )
		this.log( $template )

		if( this.settings.replaceContents === true ){

			$context.html( $template )
		}else{

			$context.append( $template )
		}

		if( templateData ){

			var temply = new Temply(templateData, $context.get(0) )

			temply.run()
		}

		$context.css({opacity: '1', visibility: 'visible'})
	}
	Fetch.prototype.lazyLoad = function( elems, callback ){

		var $elems = $( elems ),
			nElems = $elems.length || 0

		$elems.find('[data-lazy]').each( function( idx, elem ){

			var nth = idx + 1,
				img = new Image(),
				src = $( elem ).attr('data-lazy')

			img.onload = function( event ){

				$( elem ).attr('src', src)

				if( nth === nElems ){

					if( typeof callback === 'function' ){

						callback()
					}
				}
			}
			img.src = src
		})
	}
	Fetch.prototype.urlExists = function( url, callback ){

		var isBrokenLink = Cookies.get('RHLFetchBadRequests_' + window.btoa( url ) ),
			isValidLink = Cookies.get('RHLFetchRequests_' + window.btoa( url ) )

		if( typeof isBrokenLink !== 'undefined' ){

			callback( false );
		}else
		if( typeof isValidLink !== 'undefined' ){

			callback( true );
		}else{

			var xhr = new XMLHttpRequest()
			xhr.onreadystatechange = function(){

				if( xhr.readyState === 4 ){

					callback( xhr.status < 400 );
				}
			}
			xhr.open('HEAD', url)
			xhr.send()
		}
	}
	Fetch.prototype.log = function( elem, mode, key ){

		switch( mode ){
			case 'cache':

				data.requests[ key ] = elem

				break;
			default:

				if( this.settings.debug !== false ){

					return cl( elem, mode )
				}
				break;
		}
	}

	RHLApp.Fetch = Fetch
})(
	window.RHLApp = window.RHLApp || {},
	this,
	this.document,
	jQuery
)

var cl = function( elem, mode ){
	if( typeof console !== 'undefined' ){
		switch( mode ){
			case 'info':
				console.info( elem )
				break;
			case 'dir':
				console.log( elem )
				break;
			case 'error':
				console.info( elem )
				break;
			default:
				console.log( elem )
				break;
		}
	}
}
/* --- Basically an Object.assign Polyfill --- */
var NewInstance = function( target ){

	var from,
		to = target,
		index = 0,
		total = arguments.length,
		hasOwnProperty = Object.prototype.hasOwnProperty

	while( ++index < total ){
		from = arguments[ index ]
		if( from != null ){
			for( var key in from ){
				if( hasOwnProperty.call(from, key) ){
					to[ key ] = from[ key ];
				}
			}
		}
	}

	return to;
}
