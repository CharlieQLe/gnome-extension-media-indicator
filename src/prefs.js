'use strict';

const { Adw, Gio, GLib, Gtk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const { MediaSettings } = Me.imports.settings;

/**
 * Like `extension.js` this is used for any one-time setup like translations.
 *
 * @param {ExtensionMeta} meta - An extension meta object, described below.
 */
function init(meta) { }

/**
 * This function is called when the preferences window is first created to fill
 * the `Adw.PreferencesWindow`.
 *
 * This function will only be called by GNOME 42 and later. If this function is
 * present, `buildPrefsWidget()` will never be called.
 *
 * @param {Adw.PreferencesWindow} window - The preferences window
 */
function fillPreferencesWindow(window) {
    const mediaSettings = new MediaSettings();
    const builder = new Gtk.Builder();
    builder.add_from_file(`${Me.path}/ui/main.xml`);
    window.add(builder.get_object("general"));

    // Handle using a new player
    const usePlayersButton = builder.get_object(MediaSettings.USE_PREFERRED_PLAYERS.replaceAll("-", "_"));
    mediaSettings.schema.bind(MediaSettings.USE_PREFERRED_PLAYERS, usePlayersButton, "active", Gio.SettingsBindFlags.DEFAULT);

    // Initial
    const playerRows = [];
    const emptyRow = new Adw.ActionRow({ title: "No players found" });
    let preferredPlayers = mediaSettings.preferredPlayers;

    // Get the list widget
    const playerListWidget = builder.get_object("preferred_players_list");
    playerListWidget.add(emptyRow);
    
    // Handle adding a new player
    const playerListAddButton = builder.get_object("add_player");
    playerListAddButton.add_css_class("suggested-action");
    playerListAddButton.connect("clicked", () => {
        buildRow("", preferredPlayers.length);
        preferredPlayers.push("");
        mediaSettings.preferredPlayers = preferredPlayers;
    });

    // Add existing players
    preferredPlayers.forEach((playerName, index) => buildRow(playerName, index));

    // Show empty row if no other rows are found
    if (playerRows.length === 0) emptyRow.set_visible(true);

    function buildRow(text, index) {
        // Data
        const data = {
            row: new Adw.EntryRow({ title: "Player Name" }),
            index: index
        };
        playerRows.push(data);
        
        // Remove
        const removeButton = new Gtk.Button({
            valign: Gtk.Align.CENTER,
            child: new Adw.ButtonContent({
                use_underline: true,
                label: "_Remove",
                icon_name: "user-trash-symbolic"
            })
        });
        removeButton.add_css_class("destructive-action");
        removeButton.connect("clicked", () => {
            playerListWidget.remove(data.row);
            playerRows.splice(data.index, 1);
            preferredPlayers.splice(data.index, 1);
            playerRows.forEach((d, i) => {
                if (i < data.index) return;
                d.index--;
            });
            mediaSettings.preferredPlayers = preferredPlayers;
            if (playerRows.length === 0) emptyRow.set_visible(true);
        });
        data.row.add_suffix(removeButton);

        // Text
        data.row.set_text(text);
        data.row.connect("changed", () => {
            preferredPlayers[index] = data.row.get_text();
            mediaSettings.preferredPlayers = preferredPlayers;
        });

        // Hide empty row
        emptyRow.set_visible(false);

        // Add row
        playerListWidget.add(data.row);
    }
}