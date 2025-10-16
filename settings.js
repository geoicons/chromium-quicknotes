"use strict";
class SettingsManager {
    constructor() {
        this.settings = {
            defaultSecret: false
        };
        this.initializeSettings();
    }
    async initializeSettings() {
        await this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
    }
    setupEventListeners() {
        const backBtn = document.getElementById("backBtn");
        backBtn.addEventListener("click", () => {
            window.close();
        });
        const defaultSecretToggle = document.getElementById("defaultSecretToggle");
        defaultSecretToggle.addEventListener("change", (e) => {
            const isChecked = e.target.checked;
            this.updateSetting("defaultSecret", isChecked);
        });
    }
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get(["settings"]);
            if (result.settings) {
                this.settings = { ...this.settings, ...result.settings };
            }
        }
        catch (error) {
            console.error("Error loading settings:", error);
        }
    }
    async saveSettings() {
        try {
            await chrome.storage.local.set({ settings: this.settings });
        }
        catch (error) {
            console.error("Error saving settings:", error);
        }
    }
    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
    }
    updateUI() {
        const defaultSecretToggle = document.getElementById("defaultSecretToggle");
        if (defaultSecretToggle) {
            defaultSecretToggle.checked = this.settings.defaultSecret;
        }
    }
}
document.addEventListener("DOMContentLoaded", () => {
    new SettingsManager();
});
