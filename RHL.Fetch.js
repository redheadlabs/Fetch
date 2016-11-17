
  /*/-----------------------------/*/
 /*/ --- RHL Fetch --------------/*/
/*/-----------------------------/*/

;( function( RHLApp, window, document, $, undefined ){

	"use strict";

	var settings,
		defaults = {
			autoRun: false,
			replaceContents: false,
			url: config.ShopPath,
			nResults: 1,
			context: '[data-rhl-fetch="place"]', //Where the result goes
			contextRemote: '[data-rhl-fetch="fetch"]', //Where the result comes from
			template: '[type="text/template"]'
		}

	var Fetch = function( options ){

		var instance = this

		this.init( options )
		this.applyTemplate = function( item ){

			return item || null
		}
		this.onSuccess = function(){

			return instance
		}
		this.onFail = function(){

			return instance
		}
	}

	Fetch.prototype.init = function( options ){

		this.settings = settings = $.extend({}, defaults, options)

		if( this.settings.autoRun === true )
			return this.run()

		return this
	}
	Fetch.prototype.run = function( url, context ){

		var instance = this,
			url = url || this.settings.url,
			content = context || this.settings.context

		var req = this.fetch( url ).then( function( results ){

			instance.format( results )

			//console.log( results, req )
		})
	}
	Fetch.prototype.fetch = function( url ){

		var instance = this,
			url = url || instance.settings.url,
			promise = new Promise( function( resolve, reject ){

				$.ajax({
					url: url,
					error: function( xhr, textStatus, errorThrown ){

						instance.onFail()
						reject( Error('Page Not Found: ' + errorThrown) )
					}
				}).done( function( results ){

					var $results = $( results ).find( instance.settings.contextRemote )

					if( $results.length !== 0 ){

						instance.onSuccess()
						resolve( $results )
					}else{

						instance.onFail()
						reject( Error('No Results') )
					}
				})
			})

		return promise
	}
	Fetch.prototype.format = function( $results ){

		var instance = this,
			$resultItems = $results.slice(0, instance.settings.nResults),
			$context = $( instance.settings.context ),
			hasTemplate = $( instance.settings.template ).length !== 0

		if( $resultItems.length === 0 ) return

		$resultItems.each( function( idx, item ){

			var $newContent = $( item )

			if( hasTemplate ){

				$newContent = $('<div />').html( $( instance.settings.template ).html() ).html()
			}

			$context.css({opacity: '0', visibility: 'hidden'})

			instance.UpdateView( $newContent )

			if( hasTemplate ){

				var templateData = instance.applyTemplate( item ),
					temply = new Temply(templateData, $context[0] )

				temply.run()
			}

			$context.css({opacity: '1', visibility: 'visible'})
		})
	}
	Fetch.prototype.UpdateView = function( $content ){

		var $context = $( this.settings.context )

		if( this.settings.replaceContents === true ){

			$context.html( $content )
		}else{

			$context.append( $content )
		}
	}

	RHLApp.Fetch = Fetch
})(
	window.RHLApp = window.RHLApp || {},
	this,
	this.document,
	jQuery
)
