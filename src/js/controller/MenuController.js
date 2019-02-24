
"use strict";

const Config     = require( "../config" );
const Copy       = require( "../i18n/Copy" );
const ExportUtil = require( "../utils/ExportUtil" );
const SongUtil   = require( "../utils/SongUtil" );
const Pubsub     = require( "pubsub-js" );
const Messages   = require( "../definitions/Messages" );
const Manual     = require( "../definitions/Manual" );
const Fullscreen = require( "../ui/Fullscreen" );

/* private properties */

let header, menu, toggle, efflux, songController;
const MenuController = module.exports =
{
    /**
     * initialize MenuController, attach MenuView template into given container
     *
     * @param containerRef
     * @param effluxRef
     * @param songControllerRef
     */
    init( containerRef, effluxRef, songControllerRef )
    {
        efflux.TemplateService.render( "menuView", containerRef, {
    }).then(() => {

            // grab references to elements in the template

            if ( canImportExport ) {

                containerRef.querySelector( "#songImport" ).addEventListener( "click", ExportUtil.importSong );
                containerRef.querySelector( "#songExport" ).addEventListener( "click", ( aEvent ) => {
                    const song = efflux.activeSong;
                    if ( isValid( song ))
                        ExportUtil.exportSong( song );
                } );
                containerRef.querySelector( "#instrumentImport" ).addEventListener( "click", ExportUtil.importInstrument );
                containerRef.querySelector( "#instrumentExport" ).addEventListener( "click", ( aEvent ) => {
                    ExportUtil.exportInstruments( efflux.InstrumentModel.getInstruments() );
                });
            }


            if ( canDoFullscreen )
                Fullscreen.setToggleButton( containerRef.querySelector( "#fullscreenBtn" ));

            // get reference to DOM elements

            menu   = document.getElementById( "menu" );
            header = document.getElementById( "header" );
            toggle = menu.querySelector( ".toggle" );

            Pubsub.publish( Messages.MENU_INITIALIZED );
        });

        // subscribe to pubsub messaging system

        [
            Messages.WINDOW_RESIZED,
            Messages.CLOSE_OVERLAYS,
            Messages.SAVE_SONG,
            Messages.VALIDATE_AND_GET_SONG

        ].forEach(( msg ) => Pubsub.subscribe( msg, handleBroadcast ));
    }
};
