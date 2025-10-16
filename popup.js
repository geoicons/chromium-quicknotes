"use strict";
class QuickNotesApp {
    constructor() {
        this.notes = [];
        this.currentEditingId = null;
        this.currentFilter = "All";
        this.selectedTags = [];
        this.allTags = [];
        this.currentSelectedTags = [];
        this.settingsListenersSetup = false;
        this.initializeApp();
    }
    async initializeApp() {
        await this.loadNotes();
        this.updateAllTags();
        this.setupEventListeners();
        this.renderFilterChips();
        this.renderNotes();
    }
    setupEventListeners() {
        const addBtn = document.getElementById("addBtn");
        addBtn.addEventListener("click", () => this.openModal());
        const addClipboardBtn = document.getElementById("addClipboardBtn");
        addClipboardBtn.addEventListener("click", () => this.addFromClipboard());
        const settingsBtn = document.getElementById("settingsBtn");
        settingsBtn.addEventListener("click", () => this.openSettings());
        const modal = document.getElementById("noteModal");
        const closeModal = document.getElementById("closeModal");
        const cancelBtn = document.getElementById("cancelBtn");
        const saveBtn = document.getElementById("saveBtn");
        closeModal.addEventListener("click", () => this.closeModal());
        cancelBtn.addEventListener("click", () => this.closeModal());
        saveBtn.addEventListener("click", () => this.saveNote());
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
        const searchInput = document.getElementById("searchInput");
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase();
            this.filterNotes(query);
        });
        const noteTags = document.getElementById("noteTags");
        const tagsDropdown = document.getElementById("tagsDropdown");
        noteTags.addEventListener("input", () => {
            this.showTagDropdown();
        });
        noteTags.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.handleTagEnter();
            }
            else if (e.key === "Escape") {
                this.hideTagDropdown();
            }
        });
        noteTags.addEventListener("focus", () => {
            this.showTagDropdown();
        });
        document.addEventListener("click", (e) => {
            const input = document.getElementById("noteTags");
            const dropdown = document.getElementById("tagsDropdown");
            if (input && dropdown && !input.contains(e.target) && !dropdown.contains(e.target)) {
                this.hideTagDropdown();
            }
        });
    }
    async loadNotes() {
        try {
            const result = await chrome.storage.local.get(["notes"]);
            this.notes = result.notes || [];
        }
        catch (error) {
            console.error("Error loading notes:", error);
            this.notes = [];
        }
    }
    async getDefaultSecretSetting() {
        try {
            const result = await chrome.storage.local.get(["settings"]);
            return result.settings?.defaultSecret || false;
        }
        catch (error) {
            console.error("Error loading settings:", error);
            return false;
        }
    }
    async updateDefaultSecretSetting(value) {
        console.log("Updating default secret setting to:", value);
        try {
            const result = await chrome.storage.local.get(["settings"]);
            const settings = result.settings || {};
            settings.defaultSecret = value;
            await chrome.storage.local.set({ settings });
            console.log("Settings saved successfully");
        }
        catch (error) {
            console.error("Error saving settings:", error);
        }
    }
    setupSettingsEventListeners() {
        if (this.settingsListenersSetup)
            return;
        console.log("Setting up settings event listeners");
        const backToNotesBtn = document.getElementById("backToNotesBtn");
        if (backToNotesBtn) {
            backToNotesBtn.addEventListener("click", () => {
                console.log("Back to notes clicked");
                this.closeSettings();
            });
        }
        const defaultSecretToggle = document.getElementById("defaultSecretToggle");
        const toggleSwitch = defaultSecretToggle?.parentElement;
        if (defaultSecretToggle && toggleSwitch) {
            toggleSwitch.addEventListener("click", (e) => {
                e.preventDefault();
                console.log("Toggle switch clicked");
                const newValue = !defaultSecretToggle.checked;
                defaultSecretToggle.checked = newValue;
                console.log("Toggle changed to:", newValue);
                this.updateDefaultSecretSetting(newValue);
            });
            defaultSecretToggle.addEventListener("change", (e) => {
                console.log("Toggle changed:", e.target.checked);
                const isChecked = e.target.checked;
                this.updateDefaultSecretSetting(isChecked);
            });
        }
        const exportBtn = document.getElementById("exportBtn");
        if (exportBtn) {
            exportBtn.addEventListener("click", () => {
                this.exportNotes();
            });
        }
        const importBtn = document.getElementById("importBtn");
        const importFile = document.getElementById("importFile");
        if (importBtn && importFile) {
            importBtn.addEventListener("click", () => {
                importFile.click();
            });
            importFile.addEventListener("change", (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    this.importNotes(file);
                }
            });
        }
        const deleteAllBtn = document.getElementById("deleteAllBtn");
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener("click", () => {
                this.showDeleteAllDialog();
            });
        }
        this.settingsListenersSetup = true;
    }
    async saveNotes() {
        try {
            await chrome.storage.local.set({ notes: this.notes });
        }
        catch (error) {
            console.error("Error saving notes:", error);
        }
    }
    async openModal(editingNote) {
        const modal = document.getElementById("noteModal");
        const modalTitle = document.getElementById("modalTitle");
        const noteContent = document.getElementById("noteContent");
        const noteTags = document.getElementById("noteTags");
        const isSecret = document.getElementById("isSecret");
        if (editingNote) {
            this.currentEditingId = editingNote.id;
            modalTitle.textContent = "Edit Note";
            noteContent.value = editingNote.content;
            this.currentSelectedTags = [...editingNote.tags];
            noteTags.value = "";
            isSecret.checked = editingNote.isSecret;
        }
        else {
            this.currentEditingId = null;
            modalTitle.textContent = "Add New Note";
            noteContent.value = "";
            this.currentSelectedTags = [];
            noteTags.value = "";
            isSecret.checked = await this.getDefaultSecretSetting();
        }
        modal.style.display = "block";
        noteContent.focus();
        this.updateSelectedTagsDisplay();
    }
    closeModal() {
        const modal = document.getElementById("noteModal");
        modal.style.display = "none";
        this.currentEditingId = null;
    }
    openSettings() {
        const settingsPanel = document.getElementById("settingsPanel");
        settingsPanel.classList.add("show");
        this.loadSettingsForPanel();
        this.setupSettingsEventListeners();
    }
    closeSettings() {
        const settingsPanel = document.getElementById("settingsPanel");
        settingsPanel.classList.remove("show");
    }
    async loadSettingsForPanel() {
        try {
            const result = await chrome.storage.local.get(["settings"]);
            const settings = result.settings || { defaultSecret: false };
            const defaultSecretToggle = document.getElementById("defaultSecretToggle");
            if (defaultSecretToggle) {
                defaultSecretToggle.checked = settings.defaultSecret;
            }
        }
        catch (error) {
            console.error("Error loading settings:", error);
        }
    }
    async addFromClipboard() {
        try {
            if (!navigator.clipboard) {
                alert("Clipboard access not available. Please use a modern browser.");
                return;
            }
            const clipboardText = await navigator.clipboard.readText();
            if (!clipboardText || clipboardText.trim() === "") {
                alert("Clipboard is empty or contains no text.");
                return;
            }
            const defaultSecret = await this.getDefaultSecretSetting();
            const newNote = {
                id: this.generateId(),
                content: clipboardText.trim(),
                tags: [],
                isSecret: defaultSecret,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            this.notes.unshift(newNote);
            await this.saveNotes();
            this.renderNotes();
            this.showClipboardFeedback();
        }
        catch (error) {
            console.error("Error reading from clipboard:", error);
            const errorObj = error;
            if (errorObj.name === "NotAllowedError") {
                alert("Clipboard access denied. Please:\n1. Make sure you have text copied\n2. Try clicking the extension icon again\n3. Or use the 'Add Note' button instead");
            }
            else if (errorObj.name === "NotFoundError") {
                alert("No text found in clipboard. Please copy some text first.");
            }
            else {
                alert("Clipboard access failed. Please try:\n1. Copy some text first\n2. Refresh the extension\n3. Or use the 'Add Note' button instead");
            }
        }
    }
    async saveNote() {
        const noteContent = document.getElementById("noteContent");
        const isSecret = document.getElementById("isSecret");
        const content = noteContent.value.trim();
        if (!content) {
            alert("Please enter a note.");
            return;
        }
        const now = Date.now();
        if (this.currentEditingId) {
            const noteIndex = this.notes.findIndex((note) => note.id === this.currentEditingId);
            if (noteIndex !== -1) {
                this.notes[noteIndex] = {
                    ...this.notes[noteIndex],
                    content,
                    tags: [...this.currentSelectedTags],
                    isSecret: isSecret.checked,
                    updatedAt: now,
                };
            }
        }
        else {
            const newNote = {
                id: this.generateId(),
                content,
                tags: [...this.currentSelectedTags],
                isSecret: isSecret.checked,
                createdAt: now,
                updatedAt: now,
            };
            this.notes.unshift(newNote);
        }
        await this.saveNotes();
        this.updateAllTags();
        this.renderFilterChips();
        this.renderNotes();
        this.closeModal();
    }
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    renderNotes() {
        const searchInput = document.getElementById("searchInput");
        const query = searchInput ? searchInput.value.toLowerCase() : "";
        this.filterNotes(query);
    }
    createNoteElement(note) {
        const displayContent = note.isSecret ? "••••••••" : note.content;
        const contentClass = note.isSecret ? "obfuscated" : "";
        const tagsHtml = note.tags.length > 0
            ? `<div class="note-tags">${note.tags
                .map((tag) => `<span class="note-tag">${this.escapeHtml(tag)}</span>`)
                .join("")}</div>`
            : "";
        return `
            <div class="note-item" data-note-id="${note.id}">
                <div class="note-header">
                    <div class="note-title">${this.escapeHtml(displayContent)}</div>
                    <div class="note-actions">
                        <button class="note-action-btn copy-btn" data-note-id="${note.id}" title="Copy">⧉</button>
                        <button class="note-action-btn edit-btn" data-note-id="${note.id}" title="Edit">✎</button>
                        <button class="note-action-btn delete-btn" data-note-id="${note.id}" title="Delete">✕</button>
                    </div>
                </div>
                ${tagsHtml}
                <div class="note-meta">
                    <span>${this.formatDate(note.updatedAt)}</span>
                </div>
            </div>
        `;
    }
    attachNoteEventListeners() {
        document.querySelectorAll(".note-item").forEach((item) => {
            item.addEventListener("click", (e) => {
                if (e.target.closest(".note-actions")) {
                    return;
                }
                const noteId = e.currentTarget.getAttribute("data-note-id");
                if (noteId) {
                    this.copyNote(noteId);
                }
            });
        });
        document.querySelectorAll(".copy-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const noteId = e.target.dataset.noteId;
                this.copyNote(noteId);
            });
        });
        document.querySelectorAll(".edit-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const noteId = e.target.dataset.noteId;
                const note = this.notes.find((n) => n.id === noteId);
                if (note) {
                    this.openModal(note);
                }
            });
        });
        document.querySelectorAll(".delete-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const noteId = e.target.dataset.noteId;
                this.deleteNote(noteId);
            });
        });
    }
    async copyNote(noteId) {
        const note = this.notes.find((n) => n.id === noteId);
        if (!note)
            return;
        try {
            await navigator.clipboard.writeText(note.content);
            this.showCopyFeedback(noteId);
        }
        catch (error) {
            console.error("Error copying to clipboard:", error);
            this.fallbackCopyToClipboard(note.content, noteId);
        }
    }
    fallbackCopyToClipboard(text, noteId) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand("copy");
            this.showCopyFeedback(noteId);
        }
        catch (error) {
            console.error("Fallback copy failed:", error);
        }
        document.body.removeChild(textArea);
    }
    showCopyFeedback(noteId) {
        const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
        const feedback = document.createElement("div");
        feedback.textContent = "Copied!";
        if (noteElement) {
            const noteRect = noteElement.getBoundingClientRect();
            feedback.style.cssText = `
                position: fixed;
                bottom: ${window.innerHeight - noteRect.bottom + 10}px;
                right: ${window.innerWidth - noteRect.right + 10}px;
                background: #28a745;
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
                z-index: 10000;
                animation: fadeInOut 2s ease;
            `;
        }
        else {
            feedback.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
                z-index: 10000;
                animation: fadeInOut 2s ease;
            `;
        }
        const style = document.createElement("style");
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(-10px); }
                20% { opacity: 1; transform: translateY(0); }
                80% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(feedback);
        setTimeout(() => {
            document.body.removeChild(feedback);
            document.head.removeChild(style);
        }, 2000);
    }
    showClipboardFeedback() {
        const feedback = document.createElement("div");
        feedback.textContent = "📋 Added from clipboard!";
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            animation: fadeInOut 2s ease;
        `;
        const style = document.createElement("style");
        style.textContent = `
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(-10px); }
                20% { opacity: 1; transform: translateY(0); }
                80% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-10px); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(feedback);
        setTimeout(() => {
            document.body.removeChild(feedback);
            document.head.removeChild(style);
        }, 2000);
    }
    async deleteNote(noteId) {
        const shouldDelete = await this.showDeleteDialog();
        if (shouldDelete) {
            this.notes = this.notes.filter((note) => note.id !== noteId);
            await this.saveNotes();
            this.updateAllTags();
            this.renderFilterChips();
            this.renderNotes();
        }
    }
    filterNotes(query) {
        let filteredNotes = this.notes;
        if (this.selectedTags.length > 0) {
            filteredNotes = filteredNotes.filter((note) => this.selectedTags.every((selectedTag) => note.tags.includes(selectedTag)));
        }
        if (query) {
            filteredNotes = filteredNotes.filter((note) => note.content.toLowerCase().includes(query) ||
                note.tags.some((tag) => tag.toLowerCase().includes(query)));
        }
        const container = document.getElementById("notesContainer");
        if (filteredNotes.length === 0 && (query || this.selectedTags.length > 0)) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No notes found</h3>
                    <p>Try adjusting your search terms or filter</p>
                </div>
            `;
            return;
        }
        container.innerHTML = filteredNotes.map((note) => this.createNoteElement(note)).join("");
        this.attachNoteEventListeners();
    }
    escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
        const diffInHours = diffInMinutes / 60;
        if (diffInMinutes < 1) {
            return "Just now";
        }
        else if (diffInMinutes < 60) {
            return `${Math.floor(diffInMinutes)}m ago`;
        }
        else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        }
        else if (diffInHours < 168) {
            return `${Math.floor(diffInHours / 24)}d ago`;
        }
        else {
            return date.toLocaleDateString();
        }
    }
    updateAllTags() {
        const allTagsSet = new Set();
        this.notes.forEach((note) => {
            note.tags.forEach((tag) => allTagsSet.add(tag));
        });
        this.allTags = Array.from(allTagsSet).sort();
    }
    renderFilterChips() {
        const container = document.getElementById("filterChips");
        const chips = [{ name: "All", class: "all" }, ...this.allTags.map((tag) => ({ name: tag, class: "" }))];
        container.innerHTML = chips
            .map((chip) => {
            const isActive = chip.name === "All" ? this.selectedTags.length === 0 : this.selectedTags.includes(chip.name);
            return `
            <div class="filter-chip ${chip.class} ${isActive ? "active" : ""}" 
                 data-filter="${chip.name}">
                ${this.escapeHtml(chip.name)}
            </div>
        `;
        })
            .join("");
        container.querySelectorAll(".filter-chip").forEach((chip) => {
            chip.addEventListener("click", (e) => {
                const filter = e.target.dataset.filter;
                this.setFilter(filter);
            });
        });
    }
    setFilter(filter) {
        if (filter === "All") {
            this.selectedTags = [];
            this.currentFilter = "All";
        }
        else {
            const tagIndex = this.selectedTags.indexOf(filter);
            if (tagIndex > -1) {
                this.selectedTags.splice(tagIndex, 1);
            }
            else {
                this.selectedTags.push(filter);
            }
            if (this.selectedTags.length === 0) {
                this.currentFilter = "All";
            }
            else {
                this.currentFilter = this.selectedTags.join(" + ");
            }
        }
        this.renderFilterChips();
        const searchInput = document.getElementById("searchInput");
        const query = searchInput.value.toLowerCase();
        this.filterNotes(query);
    }
    showTagDropdown() {
        const input = document.getElementById("noteTags");
        const dropdown = document.getElementById("tagsDropdown");
        if (!input || !dropdown)
            return;
        const query = input.value.toLowerCase().trim();
        if (query.length === 0) {
            this.hideTagDropdown();
            return;
        }
        const matchingTags = this.allTags.filter((tag) => tag.toLowerCase().includes(query) && !this.currentSelectedTags.includes(tag));
        const exactMatch = this.allTags.find((tag) => tag.toLowerCase() === query);
        const showCreateNew = !exactMatch && query.length > 0;
        let dropdownHTML = "";
        matchingTags.slice(0, 8).forEach((tag) => {
            dropdownHTML += `
                <div class="dropdown-option" data-tag="${tag}">
                    ${this.escapeHtml(tag)}
                </div>
            `;
        });
        if (showCreateNew) {
            dropdownHTML += `
                <div class="dropdown-option create-new" data-create="${query}">
                    Create "${this.escapeHtml(query)}"
                </div>
            `;
        }
        dropdown.innerHTML = dropdownHTML;
        dropdown.classList.add("show");
        dropdown.querySelectorAll(".dropdown-option").forEach((option) => {
            option.addEventListener("click", (e) => {
                const target = e.target;
                const tag = target.dataset.tag;
                const create = target.dataset.create;
                if (tag) {
                    this.addSelectedTag(tag);
                }
                else if (create) {
                    this.addSelectedTag(create);
                }
                input.value = "";
                this.hideTagDropdown();
            });
        });
    }
    hideTagDropdown() {
        const dropdown = document.getElementById("tagsDropdown");
        if (dropdown) {
            dropdown.classList.remove("show");
        }
    }
    handleTagEnter() {
        const input = document.getElementById("noteTags");
        const query = input.value.trim();
        if (query.length === 0)
            return;
        const existingTag = this.allTags.find((tag) => tag.toLowerCase() === query.toLowerCase());
        if (existingTag) {
            this.addSelectedTag(existingTag);
        }
        else {
            this.addSelectedTag(query);
        }
        input.value = "";
        this.hideTagDropdown();
    }
    addSelectedTag(tag) {
        if (!this.currentSelectedTags.includes(tag)) {
            this.currentSelectedTags.push(tag);
            this.updateSelectedTagsDisplay();
        }
    }
    removeSelectedTag(tag) {
        this.currentSelectedTags = this.currentSelectedTags.filter((t) => t !== tag);
        this.updateSelectedTagsDisplay();
    }
    updateSelectedTagsDisplay() {
        const container = document.getElementById("selectedTags");
        if (!container)
            return;
        container.innerHTML = this.currentSelectedTags
            .map((tag) => `
            <div class="selected-tag">
                ${this.escapeHtml(tag)}
                <button class="selected-tag-remove" data-tag="${tag}">×</button>
            </div>
        `)
            .join("");
        container.querySelectorAll(".selected-tag-remove").forEach((button) => {
            button.addEventListener("click", (e) => {
                const target = e.target;
                const tag = target.dataset.tag;
                if (tag) {
                    this.removeSelectedTag(tag);
                }
            });
        });
    }
    async exportNotes() {
        try {
            const exportData = {
                version: "1.0.0",
                exportDate: new Date().toISOString(),
                notes: this.notes,
            };
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: "application/json" });
            if ("showSaveFilePicker" in window) {
                try {
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: "QuickNotes-export.json",
                        types: [
                            {
                                description: "JSON files",
                                accept: {
                                    "application/json": [".json"],
                                },
                            },
                        ],
                    });
                    const writable = await fileHandle.createWritable();
                    await writable.write(dataBlob);
                    await writable.close();
                    this.showFeedback("Notes exported successfully!", "success");
                    return;
                }
                catch (error) {
                    const errorObj = error;
                    if (errorObj.name !== "AbortError") {
                        console.log("File System Access API failed, falling back to download");
                    }
                    else {
                        return;
                    }
                }
            }
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "QuickNotes-export.json";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            this.showFeedback("Notes exported successfully!", "success");
        }
        catch (error) {
            console.error("Error exporting notes:", error);
            this.showFeedback("Error exporting notes", "error");
        }
    }
    async importNotes(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            if (!this.validateImportData(importData)) {
                this.showFeedback("Invalid file format. Please use a valid QuickNotes export file.", "error");
                return;
            }
            const importAction = await this.showImportDialog();
            if (importAction === "cancel") {
                this.showFeedback("Import cancelled", "error");
                return;
            }
            if (importAction === "replace") {
                this.notes = importData.notes;
            }
            else if (importAction === "merge") {
                const existingNotesMap = new Map(this.notes.map((note) => [note.id, note]));
                const importedNotesMap = new Map(importData.notes.map((note) => [note.id, note]));
                const mergedNotes = [...this.notes];
                for (const [id, importedNote] of importedNotesMap) {
                    const existingIndex = mergedNotes.findIndex((note) => note.id === id);
                    if (existingIndex >= 0) {
                        mergedNotes[existingIndex] = importedNote;
                    }
                    else {
                        mergedNotes.push(importedNote);
                    }
                }
                this.notes = mergedNotes;
            }
            await this.saveNotes();
            this.updateAllTags();
            this.renderFilterChips();
            this.renderNotes();
            this.showFeedback(`Successfully imported ${importData.notes.length} notes!`, "success");
        }
        catch (error) {
            console.error("Error importing notes:", error);
            this.showFeedback("Error importing notes. Please check the file format.", "error");
        }
    }
    validateImportData(data) {
        if (!data || typeof data !== "object")
            return false;
        if (!Array.isArray(data.notes))
            return false;
        for (const note of data.notes) {
            if (!note || typeof note !== "object")
                return false;
            if (!note.id || typeof note.id !== "string")
                return false;
            if (!note.content || typeof note.content !== "string")
                return false;
            if (typeof note.isSecret !== "boolean")
                return false;
            if (!Array.isArray(note.tags))
                return false;
            if (typeof note.createdAt !== "number")
                return false;
            if (typeof note.updatedAt !== "number")
                return false;
        }
        return true;
    }
    showDeleteAllDialog() {
        const overlay = document.createElement("div");
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        const dialog = document.createElement("div");
        dialog.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;
        dialog.innerHTML = `
            <h3 style="margin: 0 0 16px 0; color: #dc3545; font-size: 18px;">⚠️ Delete All Notes</h3>
            <p style="margin: 0 0 16px 0; color: #666; line-height: 1.5;">
                This will permanently delete ALL notes. This action cannot be undone.
            </p>
            <p style="margin: 0 0 16px 0; color: #333; font-weight: 500;">
                Type <strong>"delete"</strong> to confirm:
            </p>
            <input type="text" id="deleteConfirmInput" placeholder="Type 'delete' here..." style="
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                margin-bottom: 20px;
                box-sizing: border-box;
            ">
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="deleteAllCancelBtn" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                ">Cancel</button>
                <button id="deleteAllConfirmBtn" style="
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 12px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    opacity: 0.5;
                " disabled>Delete All</button>
            </div>
        `;
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        const confirmInput = dialog.querySelector("#deleteConfirmInput");
        const confirmBtn = dialog.querySelector("#deleteAllConfirmBtn");
        const cancelBtn = dialog.querySelector("#deleteAllCancelBtn");
        const updateConfirmButton = () => {
            const isValid = confirmInput.value.toLowerCase() === "delete";
            confirmBtn.disabled = !isValid;
            confirmBtn.style.opacity = isValid ? "1" : "0.5";
        };
        confirmInput.addEventListener("input", updateConfirmButton);
        const cleanup = () => {
            document.body.removeChild(overlay);
        };
        confirmBtn.addEventListener("click", () => {
            if (confirmInput.value.toLowerCase() === "delete") {
                cleanup();
                this.deleteAllNotes();
            }
        });
        cancelBtn.addEventListener("click", () => {
            cleanup();
        });
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                cleanup();
            }
        });
        setTimeout(() => confirmInput.focus(), 100);
    }
    async deleteAllNotes() {
        try {
            this.notes = [];
            await this.saveNotes();
            this.updateAllTags();
            this.renderFilterChips();
            this.renderNotes();
            this.showFeedback("All notes deleted successfully!", "success");
        }
        catch (error) {
            console.error("Error deleting all notes:", error);
            this.showFeedback("Error deleting notes", "error");
        }
    }
    showDeleteDialog() {
        return new Promise((resolve) => {
            const overlay = document.createElement("div");
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            const dialog = document.createElement("div");
            dialog.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                text-align: center;
            `;
            dialog.innerHTML = `
                <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">Delete Note</h3>
                <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">
                    Are you sure you want to delete this note? This action cannot be undone.
                </p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button id="deleteConfirmBtn" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                    ">Delete</button>
                    <button id="deleteCancelBtn" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                    ">Cancel</button>
                </div>
            `;
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            const deleteBtn = dialog.querySelector("#deleteConfirmBtn");
            const cancelBtn = dialog.querySelector("#deleteCancelBtn");
            const cleanup = () => {
                document.body.removeChild(overlay);
            };
            deleteBtn.addEventListener("click", () => {
                cleanup();
                resolve(true);
            });
            cancelBtn.addEventListener("click", () => {
                cleanup();
                resolve(false);
            });
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            });
        });
    }
    showImportDialog() {
        return new Promise((resolve) => {
            const overlay = document.createElement("div");
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            const dialog = document.createElement("div");
            dialog.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                text-align: center;
            `;
            dialog.innerHTML = `
                <h3 style="margin: 0 0 16px 0; color: #333; font-size: 18px;">Import Notes</h3>
                <p style="margin: 0 0 20px 0; color: #666; line-height: 1.5;">
                    How would you like to import the notes?
                </p>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button id="replaceBtn" style="
                        background: #dc3545;
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                    ">Replace All Notes</button>
                    <button id="mergeBtn" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                    ">Merge Notes</button>
                    <button id="cancelBtn" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 500;
                    ">Cancel</button>
                </div>
                <div style="margin-top: 16px; font-size: 12px; color: #999;">
                    <div><strong>Replace:</strong> Removes all existing notes and imports new ones</div>
                    <div><strong>Merge:</strong> Keeps existing notes, overwrites duplicates, adds new ones</div>
                </div>
            `;
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            const replaceBtn = dialog.querySelector("#replaceBtn");
            const mergeBtn = dialog.querySelector("#mergeBtn");
            const cancelBtn = dialog.querySelector("#cancelBtn");
            const cleanup = () => {
                document.body.removeChild(overlay);
            };
            replaceBtn.addEventListener("click", () => {
                cleanup();
                resolve("replace");
            });
            mergeBtn.addEventListener("click", () => {
                cleanup();
                resolve("merge");
            });
            cancelBtn.addEventListener("click", () => {
                cleanup();
                resolve("cancel");
            });
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve("cancel");
                }
            });
        });
    }
    showFeedback(message, type) {
        const feedback = document.createElement("div");
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === "success" ? "#28a745" : "#dc3545"};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            animation: fadeInOut 3s ease;
        `;
        if (!document.querySelector("#feedback-animation")) {
            const style = document.createElement("style");
            style.id = "feedback-animation";
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(-10px); }
                    20% { opacity: 1; transform: translateY(0); }
                    80% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }
        document.body.appendChild(feedback);
        setTimeout(() => {
            if (document.body.contains(feedback)) {
                document.body.removeChild(feedback);
            }
        }, 3000);
    }
}
document.addEventListener("DOMContentLoaded", () => {
    new QuickNotesApp();
});
