interface Note {
    id: string;
    content: string;
    isSecret: boolean;
    tags: string[];
    createdAt: number;
    updatedAt: number;
}

class QuickNotesApp {
    private notes: Note[] = [];
    private currentEditingId: string | null = null;
    private currentFilter: string = "All";
    private selectedTags: string[] = [];
    private allTags: string[] = [];
    private currentSelectedTags: string[] = [];
    private settingsListenersSetup: boolean = false;

    constructor() {
        this.initializeApp();
    }

    private async initializeApp(): Promise<void> {
        await this.loadNotes();
        this.updateAllTags();
        this.setupEventListeners();
        this.renderFilterChips();
        this.renderNotes();
    }

    private setupEventListeners(): void {
        // Add note button
        const addBtn = document.getElementById("addBtn") as HTMLButtonElement;
        addBtn.addEventListener("click", () => this.openModal());

        // Add clipboard button
        const addClipboardBtn = document.getElementById("addClipboardBtn") as HTMLButtonElement;
        addClipboardBtn.addEventListener("click", () => this.addFromClipboard());

        // Settings button
        const settingsBtn = document.getElementById("settingsBtn") as HTMLButtonElement;
        settingsBtn.addEventListener("click", () => this.openSettings());

        // Modal elements
        const modal = document.getElementById("noteModal") as HTMLDivElement;
        const closeModal = document.getElementById("closeModal") as HTMLButtonElement;
        const cancelBtn = document.getElementById("cancelBtn") as HTMLButtonElement;
        const saveBtn = document.getElementById("saveBtn") as HTMLButtonElement;

        closeModal.addEventListener("click", () => this.closeModal());
        cancelBtn.addEventListener("click", () => this.closeModal());
        saveBtn.addEventListener("click", () => this.saveNote());

        // Close modal when clicking outside
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Search functionality
        const searchInput = document.getElementById("searchInput") as HTMLInputElement;
        searchInput.addEventListener("input", (e) => {
            const query = (e.target as HTMLInputElement).value.toLowerCase();
            this.filterNotes(query);
        });

        // Tag dropdown functionality
        const noteTags = document.getElementById("noteTags") as HTMLInputElement;
        const tagsDropdown = document.getElementById("tagsDropdown") as HTMLDivElement;

        noteTags.addEventListener("input", () => {
            this.showTagDropdown();
        });

        noteTags.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.handleTagEnter();
            } else if (e.key === "Escape") {
                this.hideTagDropdown();
            }
        });

        noteTags.addEventListener("focus", () => {
            this.showTagDropdown();
        });

        // Hide dropdown when clicking outside
        document.addEventListener("click", (e) => {
            const input = document.getElementById("noteTags");
            const dropdown = document.getElementById("tagsDropdown");
            if (input && dropdown && !input.contains(e.target as Node) && !dropdown.contains(e.target as Node)) {
                this.hideTagDropdown();
            }
        });
    }

    private async loadNotes(): Promise<void> {
        try {
            const result = await chrome.storage.local.get(["notes"]);
            this.notes = result.notes || [];
        } catch (error) {
            console.error("Error loading notes:", error);
            this.notes = [];
        }
    }

    private async getDefaultSecretSetting(): Promise<boolean> {
        try {
            const result = await chrome.storage.local.get(["settings"]);
            return result.settings?.defaultSecret || false;
        } catch (error) {
            console.error("Error loading settings:", error);
            return false;
        }
    }

    private async updateDefaultSecretSetting(value: boolean): Promise<void> {
        console.log("Updating default secret setting to:", value);
        try {
            const result = await chrome.storage.local.get(["settings"]);
            const settings = result.settings || {};
            settings.defaultSecret = value;
            await chrome.storage.local.set({ settings });
            console.log("Settings saved successfully");
        } catch (error) {
            console.error("Error saving settings:", error);
        }
    }

    private setupSettingsEventListeners(): void {
        if (this.settingsListenersSetup) return;

        console.log("Setting up settings event listeners");

        // Back to notes button
        const backToNotesBtn = document.getElementById("backToNotesBtn") as HTMLButtonElement;
        if (backToNotesBtn) {
            backToNotesBtn.addEventListener("click", () => {
                console.log("Back to notes clicked");
                this.closeSettings();
            });
        }

        // Default secret toggle
        const defaultSecretToggle = document.getElementById("defaultSecretToggle") as HTMLInputElement;
        const toggleSwitch = defaultSecretToggle?.parentElement;

        if (defaultSecretToggle && toggleSwitch) {
            // Handle clicks on the toggle switch
            toggleSwitch.addEventListener("click", (e) => {
                e.preventDefault();
                console.log("Toggle switch clicked");
                const newValue = !defaultSecretToggle.checked;
                defaultSecretToggle.checked = newValue;
                console.log("Toggle changed to:", newValue);
                this.updateDefaultSecretSetting(newValue);
            });

            // Also handle direct input changes
            defaultSecretToggle.addEventListener("change", (e) => {
                console.log("Toggle changed:", (e.target as HTMLInputElement).checked);
                const isChecked = (e.target as HTMLInputElement).checked;
                this.updateDefaultSecretSetting(isChecked);
            });
        }

        // Export button
        const exportBtn = document.getElementById("exportBtn") as HTMLButtonElement;
        if (exportBtn) {
            exportBtn.addEventListener("click", () => {
                this.exportNotes();
            });
        }

        // Import button
        const importBtn = document.getElementById("importBtn") as HTMLButtonElement;
        const importFile = document.getElementById("importFile") as HTMLInputElement;
        if (importBtn && importFile) {
            importBtn.addEventListener("click", () => {
                importFile.click();
            });
            importFile.addEventListener("change", (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                    this.importNotes(file);
                }
            });
        }

        // Delete all button
        const deleteAllBtn = document.getElementById("deleteAllBtn") as HTMLButtonElement;
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener("click", () => {
                this.showDeleteAllDialog();
            });
        }

        this.settingsListenersSetup = true;
    }

    private async saveNotes(): Promise<void> {
        try {
            await chrome.storage.local.set({ notes: this.notes });
        } catch (error) {
            console.error("Error saving notes:", error);
        }
    }

    private async openModal(editingNote?: Note): Promise<void> {
        const modal = document.getElementById("noteModal") as HTMLDivElement;
        const modalTitle = document.getElementById("modalTitle") as HTMLHeadingElement;
        const noteContent = document.getElementById("noteContent") as HTMLTextAreaElement;
        const noteTags = document.getElementById("noteTags") as HTMLInputElement;
        const isSecret = document.getElementById("isSecret") as HTMLInputElement;

        if (editingNote) {
            this.currentEditingId = editingNote.id;
            modalTitle.textContent = "Edit Note";
            noteContent.value = editingNote.content;
            this.currentSelectedTags = [...editingNote.tags];
            noteTags.value = "";
            isSecret.checked = editingNote.isSecret;
        } else {
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

    private closeModal(): void {
        const modal = document.getElementById("noteModal") as HTMLDivElement;
        modal.style.display = "none";
        this.currentEditingId = null;
    }

    private openSettings(): void {
        const settingsPanel = document.getElementById("settingsPanel") as HTMLDivElement;
        settingsPanel.classList.add("show");
        this.loadSettingsForPanel();
        this.setupSettingsEventListeners();
    }

    private closeSettings(): void {
        const settingsPanel = document.getElementById("settingsPanel") as HTMLDivElement;
        settingsPanel.classList.remove("show");
    }

    private async loadSettingsForPanel(): Promise<void> {
        try {
            const result = await chrome.storage.local.get(["settings"]);
            const settings = result.settings || { defaultSecret: false };

            const defaultSecretToggle = document.getElementById("defaultSecretToggle") as HTMLInputElement;
            if (defaultSecretToggle) {
                defaultSecretToggle.checked = settings.defaultSecret;
            }
        } catch (error) {
            console.error("Error loading settings:", error);
        }
    }

    private async addFromClipboard(): Promise<void> {
        try {
            // Check if clipboard API is available
            if (!navigator.clipboard) {
                alert("Clipboard access not available. Please use a modern browser.");
                return;
            }

            // Read text from clipboard
            const clipboardText = await navigator.clipboard.readText();

            if (!clipboardText || clipboardText.trim() === "") {
                alert("Clipboard is empty or contains no text.");
                return;
            }

            // Create new note with clipboard content
            const defaultSecret = await this.getDefaultSecretSetting();
            const newNote: Note = {
                id: this.generateId(),
                content: clipboardText.trim(),
                tags: [], // Empty tags for clipboard notes
                isSecret: defaultSecret, // Use default secret setting
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            this.notes.unshift(newNote);
            await this.saveNotes();
            this.renderNotes();

            // Show success feedback
            this.showClipboardFeedback();
        } catch (error) {
            console.error("Error reading from clipboard:", error);

            // Provide more specific error messages
            const errorObj = error as Error;
            if (errorObj.name === "NotAllowedError") {
                alert(
                    "Clipboard access denied. Please:\n1. Make sure you have text copied\n2. Try clicking the extension icon again\n3. Or use the 'Add Note' button instead"
                );
            } else if (errorObj.name === "NotFoundError") {
                alert("No text found in clipboard. Please copy some text first.");
            } else {
                alert(
                    "Clipboard access failed. Please try:\n1. Copy some text first\n2. Refresh the extension\n3. Or use the 'Add Note' button instead"
                );
            }
        }
    }

    private async saveNote(): Promise<void> {
        const noteContent = document.getElementById("noteContent") as HTMLTextAreaElement;
        const isSecret = document.getElementById("isSecret") as HTMLInputElement;

        const content = noteContent.value.trim();

        if (!content) {
            alert("Please enter a note.");
            return;
        }

        const now = Date.now();

        if (this.currentEditingId) {
            // Update existing note
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
        } else {
            // Create new note
            const newNote: Note = {
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

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    private renderNotes(): void {
        // Apply current filter and search
        const searchInput = document.getElementById("searchInput") as HTMLInputElement;
        const query = searchInput ? searchInput.value.toLowerCase() : "";
        this.filterNotes(query);
    }

    private createNoteElement(note: Note): string {
        const displayContent = note.isSecret ? "••••••••" : note.content;
        const contentClass = note.isSecret ? "obfuscated" : "";
        const tagsHtml =
            note.tags.length > 0
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

    private attachNoteEventListeners(): void {
        // Note items (click to copy)
        document.querySelectorAll(".note-item").forEach((item) => {
            item.addEventListener("click", (e) => {
                // Only copy if clicking on the note itself, not on buttons
                if ((e.target as HTMLElement).closest(".note-actions")) {
                    return; // Don't copy if clicking on action buttons
                }
                const noteId = (e.currentTarget as HTMLElement).getAttribute("data-note-id");
                if (noteId) {
                    this.copyNote(noteId);
                }
            });
        });

        // Copy buttons
        document.querySelectorAll(".copy-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const noteId = (e.target as HTMLButtonElement).dataset.noteId;
                this.copyNote(noteId!);
            });
        });

        // Edit buttons
        document.querySelectorAll(".edit-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const noteId = (e.target as HTMLButtonElement).dataset.noteId;
                const note = this.notes.find((n) => n.id === noteId);
                if (note) {
                    this.openModal(note);
                }
            });
        });

        // Delete buttons
        document.querySelectorAll(".delete-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const noteId = (e.target as HTMLButtonElement).dataset.noteId;
                this.deleteNote(noteId!);
            });
        });
    }

    private async copyNote(noteId: string): Promise<void> {
        const note = this.notes.find((n) => n.id === noteId);
        if (!note) return;

        try {
            await navigator.clipboard.writeText(note.content);
            this.showCopyFeedback(noteId);
        } catch (error) {
            console.error("Error copying to clipboard:", error);
            // Fallback for older browsers
            this.fallbackCopyToClipboard(note.content, noteId);
        }
    }

    private fallbackCopyToClipboard(text: string, noteId: string): void {
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
        } catch (error) {
            console.error("Fallback copy failed:", error);
        }

        document.body.removeChild(textArea);
    }

    private showCopyFeedback(noteId: string): void {
        // Find the note element to position the toast relative to it
        const noteElement = document.querySelector(`[data-note-id="${noteId}"]`) as HTMLElement;

        // Create a temporary feedback element
        const feedback = document.createElement("div");
        feedback.textContent = "Copied!";

        if (noteElement) {
            // Position relative to the note element
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
        } else {
            // Fallback to top-right if note element not found
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

        // Add CSS animation
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

    private showClipboardFeedback(): void {
        // Create a temporary feedback element
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

        // Add CSS animation
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

    private async deleteNote(noteId: string): Promise<void> {
        const shouldDelete = await this.showDeleteDialog();

        if (shouldDelete) {
            this.notes = this.notes.filter((note) => note.id !== noteId);
            await this.saveNotes();
            this.updateAllTags();
            this.renderFilterChips();
            this.renderNotes();
        }
    }

    private filterNotes(query: string): void {
        let filteredNotes = this.notes;

        // Apply tag filter with AND logic for multiple selected tags
        if (this.selectedTags.length > 0) {
            filteredNotes = filteredNotes.filter((note) =>
                this.selectedTags.every((selectedTag) => note.tags.includes(selectedTag))
            );
        }

        // Apply text search if query exists
        if (query) {
            filteredNotes = filteredNotes.filter(
                (note) =>
                    note.content.toLowerCase().includes(query) ||
                    note.tags.some((tag) => tag.toLowerCase().includes(query))
            );
        }

        const container = document.getElementById("notesContainer") as HTMLDivElement;

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

    private escapeHtml(text: string): string {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    private formatDate(timestamp: number): string {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
        const diffInHours = diffInMinutes / 60;

        if (diffInMinutes < 1) {
            return "Just now";
        } else if (diffInMinutes < 60) {
            return `${Math.floor(diffInMinutes)}m ago`;
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else if (diffInHours < 168) {
            // 7 days
            return `${Math.floor(diffInHours / 24)}d ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    private updateAllTags(): void {
        const allTagsSet = new Set<string>();
        this.notes.forEach((note) => {
            note.tags.forEach((tag) => allTagsSet.add(tag));
        });
        this.allTags = Array.from(allTagsSet).sort();
    }

    private renderFilterChips(): void {
        const container = document.getElementById("filterChips") as HTMLDivElement;

        const chips = [{ name: "All", class: "all" }, ...this.allTags.map((tag) => ({ name: tag, class: "" }))];

        container.innerHTML = chips
            .map((chip) => {
                const isActive =
                    chip.name === "All" ? this.selectedTags.length === 0 : this.selectedTags.includes(chip.name);
                return `
            <div class="filter-chip ${chip.class} ${isActive ? "active" : ""}" 
                 data-filter="${chip.name}">
                ${this.escapeHtml(chip.name)}
            </div>
        `;
            })
            .join("");

        // Add event listeners
        container.querySelectorAll(".filter-chip").forEach((chip) => {
            chip.addEventListener("click", (e) => {
                const filter = (e.target as HTMLDivElement).dataset.filter;
                this.setFilter(filter!);
            });
        });
    }

    private setFilter(filter: string): void {
        if (filter === "All") {
            // Clicking "All" clears all tag selections
            this.selectedTags = [];
            this.currentFilter = "All";
        } else {
            // Toggle the tag in/out of selection
            const tagIndex = this.selectedTags.indexOf(filter);
            if (tagIndex > -1) {
                // Tag is selected, remove it
                this.selectedTags.splice(tagIndex, 1);
            } else {
                // Tag is not selected, add it
                this.selectedTags.push(filter);
            }

            // Update current filter for display purposes
            if (this.selectedTags.length === 0) {
                this.currentFilter = "All";
            } else {
                this.currentFilter = this.selectedTags.join(" + ");
            }
        }

        this.renderFilterChips();

        // Apply current search query along with the new filter
        const searchInput = document.getElementById("searchInput") as HTMLInputElement;
        const query = searchInput.value.toLowerCase();
        this.filterNotes(query);
    }

    private showTagDropdown(): void {
        const input = document.getElementById("noteTags") as HTMLInputElement;
        const dropdown = document.getElementById("tagsDropdown") as HTMLDivElement;

        if (!input || !dropdown) return;

        const query = input.value.toLowerCase().trim();

        if (query.length === 0) {
            this.hideTagDropdown();
            return;
        }

        // Find matching tags that aren't already selected
        const matchingTags = this.allTags.filter(
            (tag) => tag.toLowerCase().includes(query) && !this.currentSelectedTags.includes(tag)
        );

        // Check if the exact query matches an existing tag
        const exactMatch = this.allTags.find((tag) => tag.toLowerCase() === query);
        const showCreateNew = !exactMatch && query.length > 0;

        let dropdownHTML = "";

        // Add matching existing tags
        matchingTags.slice(0, 8).forEach((tag) => {
            dropdownHTML += `
                <div class="dropdown-option" data-tag="${tag}">
                    ${this.escapeHtml(tag)}
                </div>
            `;
        });

        // Add "create new" option if needed
        if (showCreateNew) {
            dropdownHTML += `
                <div class="dropdown-option create-new" data-create="${query}">
                    Create "${this.escapeHtml(query)}"
                </div>
            `;
        }

        dropdown.innerHTML = dropdownHTML;
        dropdown.classList.add("show");

        // Add click handlers
        dropdown.querySelectorAll(".dropdown-option").forEach((option) => {
            option.addEventListener("click", (e) => {
                const target = e.target as HTMLDivElement;
                const tag = target.dataset.tag;
                const create = target.dataset.create;

                if (tag) {
                    this.addSelectedTag(tag);
                } else if (create) {
                    this.addSelectedTag(create);
                }

                input.value = "";
                this.hideTagDropdown();
            });
        });
    }

    private hideTagDropdown(): void {
        const dropdown = document.getElementById("tagsDropdown") as HTMLDivElement;
        if (dropdown) {
            dropdown.classList.remove("show");
        }
    }

    private handleTagEnter(): void {
        const input = document.getElementById("noteTags") as HTMLInputElement;
        const query = input.value.trim();

        if (query.length === 0) return;

        // Check if it's an existing tag
        const existingTag = this.allTags.find((tag) => tag.toLowerCase() === query.toLowerCase());

        if (existingTag) {
            this.addSelectedTag(existingTag);
        } else {
            this.addSelectedTag(query);
        }

        input.value = "";
        this.hideTagDropdown();
    }

    private addSelectedTag(tag: string): void {
        if (!this.currentSelectedTags.includes(tag)) {
            this.currentSelectedTags.push(tag);
            this.updateSelectedTagsDisplay();
        }
    }

    private removeSelectedTag(tag: string): void {
        this.currentSelectedTags = this.currentSelectedTags.filter((t) => t !== tag);
        this.updateSelectedTagsDisplay();
    }

    private updateSelectedTagsDisplay(): void {
        const container = document.getElementById("selectedTags") as HTMLDivElement;

        if (!container) return;

        container.innerHTML = this.currentSelectedTags
            .map(
                (tag) => `
            <div class="selected-tag">
                ${this.escapeHtml(tag)}
                <button class="selected-tag-remove" data-tag="${tag}">×</button>
            </div>
        `
            )
            .join("");

        // Add remove handlers
        container.querySelectorAll(".selected-tag-remove").forEach((button) => {
            button.addEventListener("click", (e) => {
                const target = e.target as HTMLButtonElement;
                const tag = target.dataset.tag;
                if (tag) {
                    this.removeSelectedTag(tag);
                }
            });
        });
    }

    private async exportNotes(): Promise<void> {
        try {
            const exportData = {
                version: "1.0.0",
                exportDate: new Date().toISOString(),
                notes: this.notes,
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: "application/json" });

            // Try to use File System Access API for better file picker
            if ("showSaveFilePicker" in window) {
                try {
                    const fileHandle = await (window as any).showSaveFilePicker({
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
                } catch (error) {
                    // User cancelled or error occurred, fall back to download
                    const errorObj = error as Error;
                    if (errorObj.name !== "AbortError") {
                        console.log("File System Access API failed, falling back to download");
                    } else {
                        // User cancelled
                        return;
                    }
                }
            }

            // Fallback to traditional download
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "QuickNotes-export.json";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showFeedback("Notes exported successfully!", "success");
        } catch (error) {
            console.error("Error exporting notes:", error);
            this.showFeedback("Error exporting notes", "error");
        }
    }

    private async importNotes(file: File): Promise<void> {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);

            // Validate the import data structure
            if (!this.validateImportData(importData)) {
                this.showFeedback("Invalid file format. Please use a valid QuickNotes export file.", "error");
                return;
            }

            // Show custom import dialog with three options
            const importAction = await this.showImportDialog();

            if (importAction === "cancel") {
                this.showFeedback("Import cancelled", "error");
                return;
            }

            if (importAction === "replace") {
                // Replace all notes
                this.notes = importData.notes;
            } else if (importAction === "merge") {
                // Merge notes - imported notes take precedence over existing ones
                const existingNotesMap = new Map(this.notes.map((note: Note) => [note.id, note]));
                const importedNotesMap = new Map(importData.notes.map((note: Note) => [note.id, note]));

                // Start with existing notes, then overwrite/add with imported notes
                const mergedNotes = [...this.notes];

                for (const [id, importedNote] of importedNotesMap) {
                    const existingIndex = mergedNotes.findIndex((note) => note.id === id);
                    if (existingIndex >= 0) {
                        // Overwrite existing note
                        mergedNotes[existingIndex] = importedNote as Note;
                    } else {
                        // Add new note
                        mergedNotes.push(importedNote as Note);
                    }
                }

                this.notes = mergedNotes;
            }

            await this.saveNotes();
            this.updateAllTags();
            this.renderFilterChips();
            this.renderNotes();

            this.showFeedback(`Successfully imported ${importData.notes.length} notes!`, "success");
        } catch (error) {
            console.error("Error importing notes:", error);
            this.showFeedback("Error importing notes. Please check the file format.", "error");
        }
    }

    private validateImportData(data: any): boolean {
        if (!data || typeof data !== "object") return false;
        if (!Array.isArray(data.notes)) return false;

        // Validate each note structure
        for (const note of data.notes) {
            if (!note || typeof note !== "object") return false;
            if (!note.id || typeof note.id !== "string") return false;
            if (!note.content || typeof note.content !== "string") return false;
            if (typeof note.isSecret !== "boolean") return false;
            if (!Array.isArray(note.tags)) return false;
            if (typeof note.createdAt !== "number") return false;
            if (typeof note.updatedAt !== "number") return false;
        }

        return true;
    }

    private showDeleteAllDialog(): void {
        // Create modal overlay
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

        // Create dialog box
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

        // Get elements
        const confirmInput = dialog.querySelector("#deleteConfirmInput") as HTMLInputElement;
        const confirmBtn = dialog.querySelector("#deleteAllConfirmBtn") as HTMLButtonElement;
        const cancelBtn = dialog.querySelector("#deleteAllCancelBtn") as HTMLButtonElement;

        // Enable/disable confirm button based on input
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

        // Close on overlay click
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) {
                cleanup();
            }
        });

        // Focus the input
        setTimeout(() => confirmInput.focus(), 100);
    }

    private async deleteAllNotes(): Promise<void> {
        try {
            this.notes = [];
            await this.saveNotes();
            this.updateAllTags();
            this.renderFilterChips();
            this.renderNotes();
            this.showFeedback("All notes deleted successfully!", "success");
        } catch (error) {
            console.error("Error deleting all notes:", error);
            this.showFeedback("Error deleting notes", "error");
        }
    }

    private showDeleteDialog(): Promise<boolean> {
        return new Promise((resolve) => {
            // Create modal overlay
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

            // Create dialog box
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

            // Add event listeners
            const deleteBtn = dialog.querySelector("#deleteConfirmBtn") as HTMLButtonElement;
            const cancelBtn = dialog.querySelector("#deleteCancelBtn") as HTMLButtonElement;

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

            // Close on overlay click
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(false);
                }
            });
        });
    }

    private showImportDialog(): Promise<"replace" | "merge" | "cancel"> {
        return new Promise((resolve) => {
            // Create modal overlay
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

            // Create dialog box
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

            // Add event listeners
            const replaceBtn = dialog.querySelector("#replaceBtn") as HTMLButtonElement;
            const mergeBtn = dialog.querySelector("#mergeBtn") as HTMLButtonElement;
            const cancelBtn = dialog.querySelector("#cancelBtn") as HTMLButtonElement;

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

            // Close on overlay click
            overlay.addEventListener("click", (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve("cancel");
                }
            });
        });
    }

    private showFeedback(message: string, type: "success" | "error"): void {
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

        // Add CSS animation if not already present
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

// Initialize the app when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    new QuickNotesApp();
});
