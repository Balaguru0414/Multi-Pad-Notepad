/**
 * Multi-Notepad Web Application with Plain Text Paste Enforcement & LocalStorage
 */

(function () {
    'use strict';

    // --- Storage Keys ---
    const STORAGE_KEYS = {
        NOTES: 'notepad_app_notes_v1',
        ACTIVE_ID: 'notepad_app_active_id_v1',
        SETTINGS: 'notepad_app_settings_v1',
        SIDEBAR: 'notepad_app_sidebar_v1',
        THEME: 'notepad_app_theme_v1'
    };

    // --- State ---
    let notes = [];
    let activeNoteId = null;
    let saveTimeout = null;
    let settings = {
        fontFamily: 'font-sans',
        fontSize: 16,
        lineHeight: 'leading-relaxed',
        wordWrap: true
    };

    let currentMode = 'rich'; // 'rich' (ChatGPT style) or 'plain'

    // --- DOM Elements ---
    const editor = document.getElementById('editor');
    const richEditor = document.getElementById('richEditor');
    const modePlainBtn = document.getElementById('modePlainBtn');
    const modeRichBtn = document.getElementById('modeRichBtn');
    const richToolbarControls = document.getElementById('richToolbarControls');
    const richBoldBtn = document.getElementById('richBoldBtn');
    const richItalicBtn = document.getElementById('richItalicBtn');
    const richUnderlineBtn = document.getElementById('richUnderlineBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    const noteTitleInput = document.getElementById('noteTitleInput');
    const currentNoteTitleDisplay = document.getElementById('currentNoteTitleDisplay');
    const noteSelectorBtn = document.getElementById('noteSelectorBtn');
    const noteDropdownMenu = document.getElementById('noteDropdownMenu');
    const dropdownNoteList = document.getElementById('dropdownNoteList');
    const sidebarNoteList = document.getElementById('sidebarNoteList');
    const noteCountBadge = document.getElementById('noteCountBadge');
    const sidebarSearchInput = document.getElementById('sidebarSearchInput');
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const closeSidebarMobileBtn = document.getElementById('closeSidebarMobileBtn');

    // Buttons
    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const newNoteBtn = document.getElementById('newNoteBtn');
    const sidebarNewBtn = document.getElementById('sidebarNewBtn');
    const dropdownNewNoteBtn = document.getElementById('dropdownNewNoteBtn');
    const duplicateNoteBtn = document.getElementById('duplicateNoteBtn');
    const deleteNoteBtn = document.getElementById('deleteNoteBtn');
    const copyTextBtn = document.getElementById('copyTextBtn');
    const copyToast = document.getElementById('copyToast');
    const downloadBtn = document.getElementById('downloadBtn');
    const cleanFormatBtn = document.getElementById('cleanFormatBtn');
    const exportAllBtn = document.getElementById('exportAllBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');

    // Search & Replace State
    let searchMatches = [];
    let currentMatchIndex = -1;
    let matchCase = false;
    let matchWord = false;

    // Search & Replace DOM Elements
    const toggleSearchBtn = document.getElementById('toggleSearchBtn');
    const searchBar = document.getElementById('searchBar');
    const searchInput = document.getElementById('searchInput');
    const replaceInput = document.getElementById('replaceInput');
    const replaceBtn = document.getElementById('replaceBtn');
    const replaceAllBtn = document.getElementById('replaceAllBtn');
    const closeSearchBtn = document.getElementById('closeSearchBtn');
    const toggleReplaceDrawerBtn = document.getElementById('toggleReplaceDrawerBtn');
    const replaceDrawerIcon = document.getElementById('replaceDrawerIcon');
    const replaceRow = document.getElementById('replaceRow');
    const matchCaseBtn = document.getElementById('matchCaseBtn');
    const matchWordBtn = document.getElementById('matchWordBtn');
    const searchStatusText = document.getElementById('searchStatusText');
    const prevMatchBtn = document.getElementById('prevMatchBtn');
    const nextMatchBtn = document.getElementById('nextMatchBtn');

    // Settings
    const toggleSettingsBtn = document.getElementById('toggleSettingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const fontSizeRange = document.getElementById('fontSizeRange');
    const modalFontSizeVal = document.getElementById('modalFontSizeVal');
    const fontSizeDisplay = document.getElementById('fontSizeDisplay');
    const lineHeightSelect = document.getElementById('lineHeightSelect');
    const wordWrapToggle = document.getElementById('wordWrapToggle');
    const quickFontMinus = document.getElementById('quickFontMinus');
    const quickFontPlus = document.getElementById('quickFontPlus');

    // Stats & Status
    const charCount = document.getElementById('charCount');
    const wordCount = document.getElementById('wordCount');
    const lineCount = document.getElementById('lineCount');
    const readTime = document.getElementById('readTime');
    const saveStatus = document.getElementById('saveStatus');
    const toggleFullscreenBtn = document.getElementById('toggleFullscreenBtn');
    const fullscreenIcon = document.getElementById('fullscreenIcon');

    // --- Helper Functions ---
    function generateId() {
        return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    function formatDate(timestamp) {
        const d = new Date(timestamp);
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    // --- Core Storage Functions ---
    // --- Theme Manager (Light & Dark Mode) ---
    function toggleTheme(explicitTheme) {
        const html = document.documentElement;
        const body = document.body;
        const isDark = html.classList.contains('dark');
        const newTheme = explicitTheme || (isDark ? 'light' : 'dark');

        if (newTheme === 'dark') {
            html.classList.add('dark');
            if (body) body.classList.add('dark');
        } else {
            html.classList.remove('dark');
            if (body) body.classList.remove('dark');
        }

        try {
            localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
        } catch (e) {
            console.error('Failed to save theme setting:', e);
        }

        // Trigger smooth flip animation on toggle button
        if (themeToggleBtn) {
            themeToggleBtn.classList.remove('theme-animate');
            void themeToggleBtn.offsetWidth; // Trigger reflow for re-animation
            themeToggleBtn.classList.add('theme-animate');
        }

        if (window.lucide) lucide.createIcons();
    }

    function loadFromStorage() {
        try {
            const storedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
            notes = storedNotes ? JSON.parse(storedNotes) : [];
            activeNoteId = localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
            
            const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            if (storedSettings) {
                settings = { ...settings, ...JSON.parse(storedSettings) };
            }

            const sidebarState = localStorage.getItem(STORAGE_KEYS.SIDEBAR);
            if (sidebarState === 'collapsed') {
                sidebar.classList.add('collapsed');
            }

            const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
            toggleTheme(savedTheme);
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            notes = [];
        }

        // If no notes exist, create default note
        if (notes.length === 0) {
            createNote('Welcome Notepad', `Welcome to your offline Multi-Notepad! 🚀

Key Features:
1. Multiple Notepads: Create, switch, rename, and manage multiple notes easily using the top dropdown or sidebar.
2. Plain Text Enforcement: When pasting text from websites or formatted documents, rich text/HTML is automatically stripped. Only clean plain text is pasted!
3. Local Storage Auto-Save: Everything you type is automatically saved in your browser.
4. Quick Tools: Copy all plain text, download as .txt, find & replace, customizable fonts, and live word/character statistics.

Try creating a new notepad with Ctrl+N or using the 'New' button above!`);
        } else {
            // Validate active note ID
            const existing = notes.find(n => n.id === activeNoteId);
            if (!existing) {
                activeNoteId = notes[0].id;
            }
        }
    }

    function saveNotesToStorage() {
        try {
            localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
            if (activeNoteId) {
                localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, activeNoteId);
            }
            updateSaveStatusIndicator('Saved to Local Storage', 'check');
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            updateSaveStatusIndicator('Error saving', 'alert-circle');
        }
    }

    function saveSettingsToStorage() {
        try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }

    function updateSaveStatusIndicator(message, iconName) {
        if (!saveStatus) return;
        saveStatus.innerHTML = `<i data-lucide="${iconName}" class="w-3 h-3 text-gray-400"></i> ${message}`;
        if (window.lucide) lucide.createIcons();
    }

    // --- Mobile Sidebar Drawer Helpers ---
    function isMobileView() {
        return window.innerWidth < 768;
    }

    function openMobileSidebar() {
        sidebar.classList.add('mobile-open');
        sidebarBackdrop.classList.remove('hidden');
        setTimeout(() => sidebarBackdrop.classList.add('active'), 10);
    }

    function closeMobileSidebar() {
        sidebar.classList.remove('mobile-open');
        sidebarBackdrop.classList.remove('active');
        setTimeout(() => sidebarBackdrop.classList.add('hidden'), 300);
    }

    function toggleSidebar() {
        if (isMobileView()) {
            if (sidebar.classList.contains('mobile-open')) {
                closeMobileSidebar();
            } else {
                openMobileSidebar();
            }
        } else {
            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem(STORAGE_KEYS.SIDEBAR, isCollapsed ? 'collapsed' : 'expanded');
        }
    }

    // --- Active Note Utilities ---
    function getActiveNote() {
        return notes.find(n => n.id === activeNoteId);
    }

    function setActiveNote(id) {
        activeNoteId = id;
        localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
        renderCurrentNote();
        renderNoteLists();
        if (isMobileView()) {
            closeMobileSidebar();
        }
    }

    function createNote(title = '', content = '') {
        const noteIndex = notes.length + 1;
        const newNote = {
            id: generateId(),
            title: title || `Notepad ${noteIndex}`,
            content: content,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        notes.unshift(newNote); // Add to top of list
        activeNoteId = newNote.id;
        saveNotesToStorage();
        renderCurrentNote();
        renderNoteLists();
        if (isMobileView()) {
            closeMobileSidebar();
        }
        editor.focus();
    }

    function duplicateActiveNote() {
        const current = getActiveNote();
        if (!current) return;

        const copyNote = {
            id: generateId(),
            title: `${current.title} (Copy)`,
            content: current.content,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        notes.unshift(copyNote);
        activeNoteId = copyNote.id;
        saveNotesToStorage();
        renderCurrentNote();
        renderNoteLists();
    }

    // --- Custom Confirm Modal & Context Menu Engine ---
    let pendingConfirmAction = null;
    const customConfirmModal = document.getElementById('customConfirmModal');
    const confirmModalTitle = document.getElementById('confirmModalTitle');
    const confirmModalMessage = document.getElementById('confirmModalMessage');
    const confirmModalIcon = document.getElementById('confirmModalIcon');
    const confirmModalIconBg = document.getElementById('confirmModalIconBg');
    const confirmModalCancelBtn = document.getElementById('confirmModalCancelBtn');
    const confirmModalOkBtn = document.getElementById('confirmModalOkBtn');
    const sidebarItemContextMenu = document.getElementById('sidebarItemContextMenu');
    const ctxExportBtn = document.getElementById('ctxExportBtn');
    const ctxDuplicateBtn = document.getElementById('ctxDuplicateBtn');
    const ctxDeleteBtn = document.getElementById('ctxDeleteBtn');
    let activeContextMenuNoteId = null;

    function showCustomConfirm(options) {
        const {
            title = 'Confirm Action',
            message = 'Are you sure you want to proceed?',
            confirmText = 'Confirm',
            confirmStyle = 'bg-red-600 hover:bg-red-500 shadow-red-600/30',
            icon = 'trash-2',
            iconColor = 'text-red-400',
            iconBg = 'bg-red-950/60 border-red-800/50',
            onConfirm
        } = options;

        if (confirmModalTitle) confirmModalTitle.textContent = title;
        if (confirmModalMessage) confirmModalMessage.textContent = message;
        if (confirmModalOkBtn) {
            confirmModalOkBtn.textContent = confirmText;
            confirmModalOkBtn.className = `flex-1 py-2 px-4 text-white rounded-xl text-xs font-semibold shadow-lg transition-all ${confirmStyle}`;
        }
        
        if (confirmModalIcon) {
            confirmModalIcon.setAttribute('data-lucide', icon);
            confirmModalIcon.className = `w-6 h-6 ${iconColor}`;
        }
        if (confirmModalIconBg) {
            confirmModalIconBg.className = `w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${iconBg}`;
        }

        pendingConfirmAction = onConfirm;
        if (customConfirmModal) customConfirmModal.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    function closeCustomConfirm() {
        if (customConfirmModal) customConfirmModal.classList.add('hidden');
        pendingConfirmAction = null;
    }

    if (confirmModalCancelBtn) {
        confirmModalCancelBtn.addEventListener('click', closeCustomConfirm);
    }
    if (confirmModalOkBtn) {
        confirmModalOkBtn.addEventListener('click', () => {
            if (typeof pendingConfirmAction === 'function') {
                const action = pendingConfirmAction;
                closeCustomConfirm();
                action();
            } else {
                closeCustomConfirm();
            }
        });
    }

    function openContextMenu(targetBtn) {
        if (!sidebarItemContextMenu || !targetBtn) return;
        const rect = targetBtn.getBoundingClientRect();
        sidebarItemContextMenu.style.top = `${rect.bottom + 4}px`;
        sidebarItemContextMenu.style.left = `${Math.min(rect.right - 140, window.innerWidth - 170)}px`;
        sidebarItemContextMenu.classList.remove('hidden');
        if (window.lucide) lucide.createIcons();
    }

    function closeContextMenu() {
        if (sidebarItemContextMenu) {
            sidebarItemContextMenu.classList.add('hidden');
        }
        activeContextMenuNoteId = null;
    }

    document.addEventListener('click', (e) => {
        if (sidebarItemContextMenu && !sidebarItemContextMenu.contains(e.target) && !e.target.closest('.note-more-btn')) {
            closeContextMenu();
        }
    });

    if (ctxExportBtn) {
        ctxExportBtn.addEventListener('click', () => {
            if (activeContextMenuNoteId) {
                exportNoteById(activeContextMenuNoteId);
            }
            closeContextMenu();
        });
    }

    if (ctxDuplicateBtn) {
        ctxDuplicateBtn.addEventListener('click', () => {
            if (activeContextMenuNoteId) {
                duplicateNoteById(activeContextMenuNoteId);
            }
            closeContextMenu();
        });
    }

    if (ctxDeleteBtn) {
        ctxDeleteBtn.addEventListener('click', () => {
            if (activeContextMenuNoteId) {
                const noteId = activeContextMenuNoteId;
                closeContextMenu();
                deleteNoteById(noteId);
            }
        });
    }

    function exportNoteById(id) {
        const note = notes.find(n => n.id === id);
        if (!note) return;
        const text = note.content || (note.htmlContent ? htmlToCleanPlainText(note.htmlContent) : '');
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(note.title || 'notepad').replace(/[^a-z0-9_-]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function duplicateNoteById(id) {
        const note = notes.find(n => n.id === id);
        if (!note) return;

        const copyNote = {
            id: generateId(),
            title: `${note.title} (Copy)`,
            content: note.content || '',
            htmlContent: note.htmlContent || '',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        notes.unshift(copyNote);
        activeNoteId = copyNote.id;
        saveNotesToStorage();
        renderCurrentNote();
        renderNoteLists();
    }

    function deleteNoteById(id) {
        const note = notes.find(n => n.id === id);
        if (!note) return;

        if (notes.length <= 1) {
            showCustomConfirm({
                title: 'Clear Notepad?',
                message: `Are you sure you want to clear "${note.title}"? Since this is your last notepad, its contents will be reset.`,
                confirmText: 'Clear',
                confirmStyle: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30',
                icon: 'alert-triangle',
                iconColor: 'text-amber-400',
                iconBg: 'bg-amber-950/60 border-amber-800/50',
                onConfirm: () => {
                    note.content = '';
                    note.htmlContent = '';
                    note.title = 'Untitled Notepad';
                    note.updatedAt = Date.now();
                    saveNotesToStorage();
                    renderCurrentNote();
                    renderNoteLists();
                }
            });
            return;
        }

        showCustomConfirm({
            title: 'Delete Notepad?',
            message: `Are you sure you want to delete "${note.title}"? This action cannot be undone.`,
            confirmText: 'Delete',
            confirmStyle: 'bg-red-600 hover:bg-red-500 shadow-red-600/30',
            icon: 'trash-2',
            iconColor: 'text-red-400',
            iconBg: 'bg-red-950/60 border-red-800/50',
            onConfirm: () => {
                notes = notes.filter(n => n.id !== id);
                if (activeNoteId === id) {
                    activeNoteId = notes[0].id;
                }
                saveNotesToStorage();
                renderCurrentNote();
                renderNoteLists();
            }
        });
    }

    function deleteActiveNote() {
        if (activeNoteId) {
            deleteNoteById(activeNoteId);
        }
    }

    // --- HTML Sanitizer & Cleaners ---
    function sanitizeRichHtml(html) {
        if (!html) return '';
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Strip scripts, styles, metadata, objects
            const removeTags = doc.querySelectorAll('script, style, iframe, meta, link, object, embed, xml, o\\:p');
            removeTags.forEach(el => el.remove());

            // Replace <mark> tags with plain <span>
            const marks = doc.querySelectorAll('mark');
            marks.forEach(mark => {
                const span = doc.createElement('span');
                span.innerHTML = mark.innerHTML;
                mark.replaceWith(span);
            });

            // Clean unwanted inline attributes (colors, background-color, font families) that break dark UI
            const allElements = doc.querySelectorAll('*');
            allElements.forEach(el => {
                el.removeAttribute('style');
                el.removeAttribute('class');
                el.removeAttribute('id');
                el.removeAttribute('color');
                el.removeAttribute('bgcolor');
                el.removeAttribute('face');
            });

            // Unwrap styling spans that have no attributes left
            const spans = doc.querySelectorAll('span');
            spans.forEach(span => {
                if (span.attributes.length === 0) {
                    span.replaceWith(...span.childNodes);
                }
            });

            return doc.body ? doc.body.innerHTML : html;
        } catch (e) {
            console.warn('HTML sanitize failed:', e);
            return html;
        }
    }

    function htmlToCleanPlainText(html) {
        if (!html) return '';
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Insert newlines around block level elements for proper paragraph spacing
            const blocks = doc.querySelectorAll('h1, h2, h3, h4, h5, h6, p, div, li, tr, blockquote, article, section');
            blocks.forEach(el => {
                const text = el.textContent.trim();
                if (text) {
                    el.insertAdjacentText('beforebegin', '\n');
                    el.insertAdjacentText('afterend', '\n');
                }
            });

            // Convert <br> tags to newlines
            const brs = doc.querySelectorAll('br');
            brs.forEach(br => br.replaceWith('\n'));

            let rawText = doc.body ? doc.body.textContent : doc.textContent;

            // Clean up whitespace & normalize line breaks
            return rawText
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                .replace(/[ \t]+\n/g, '\n')
                .replace(/\n[ \t]+/g, '\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();
        } catch (e) {
            console.warn('HTML parse failed, falling back to plain text:', e);
            return '';
        }
    }

    function textToHtmlParagraphs(text) {
        if (!text) return '';
        return text.split('\n')
            .map(line => {
                const trimmed = line.trim();
                return trimmed ? `<p>${escapeHtml(trimmed)}</p>` : '<br>';
            })
            .join('');
    }

    // --- Mode Switcher ---
    function setEditorMode(mode) {
        currentMode = mode;
        if (mode === 'plain') {
            modePlainBtn.className = "px-2.5 py-0.5 rounded-md font-medium transition-all bg-blue-600 text-white shadow-xs";
            modeRichBtn.className = "px-2.5 py-0.5 rounded-md font-medium transition-all text-gray-400 hover:text-white";
            if (richToolbarControls) richToolbarControls.classList.add('hidden');

            editor.value = htmlToCleanPlainText(richEditor.innerHTML);
            richEditor.classList.add('hidden');
            editor.classList.remove('hidden');
            editor.focus();
        } else {
            modeRichBtn.className = "px-2.5 py-0.5 rounded-md font-medium transition-all bg-blue-600 text-white shadow-xs";
            modePlainBtn.className = "px-2.5 py-0.5 rounded-md font-medium transition-all text-gray-400 hover:text-white";
            if (richToolbarControls) richToolbarControls.classList.remove('hidden');

            if (editor.value.trim() && (!richEditor.innerHTML.trim() || richEditor.innerHTML === '<br>')) {
                richEditor.innerHTML = textToHtmlParagraphs(editor.value);
            }
            editor.classList.add('hidden');
            richEditor.classList.remove('hidden');
            richEditor.focus();
        }
        handleEditorInput();
    }

    // --- Paste & Input Event Handlers ---
    function setupEditorsAndPaste() {
        // Plain Text Textarea Input
        editor.addEventListener('input', handleEditorInput);
        editor.addEventListener('paste', function (e) {
            e.preventDefault();
            const clipboardData = e.clipboardData || window.clipboardData;
            if (!clipboardData) return;

            let text = '';
            const htmlData = clipboardData.getData('text/html');
            if (htmlData) {
                text = htmlToCleanPlainText(htmlData);
            }
            if (!text) {
                text = (clipboardData.getData('text/plain') || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
            }
            if (!text) return;

            const start = editor.selectionStart;
            const end = editor.selectionEnd;
            const val = editor.value;
            editor.value = val.substring(0, start) + text + val.substring(end);
            editor.selectionStart = editor.selectionEnd = start + text.length;
            handleEditorInput();
        });

        // Rich Text Editor (ChatGPT Style) Input & Paste
        richEditor.addEventListener('input', handleEditorInput);
        richEditor.addEventListener('paste', function (e) {
            e.preventDefault();
            const clipboardData = e.clipboardData || window.clipboardData;
            if (!clipboardData) return;

            const htmlData = clipboardData.getData('text/html');
            let contentToInsert = '';

            if (htmlData) {
                contentToInsert = sanitizeRichHtml(htmlData);
            } else {
                const textData = clipboardData.getData('text/plain') || '';
                contentToInsert = textToHtmlParagraphs(textData);
            }

            if (contentToInsert) {
                document.execCommand('insertHTML', false, contentToInsert);

                // Post-paste cleanup to guarantee no background color attributes linger
                const pastedEls = richEditor.querySelectorAll('*');
                pastedEls.forEach(el => {
                    el.removeAttribute('style');
                    el.removeAttribute('bgcolor');
                    el.removeAttribute('class');
                });

                handleEditorInput();
            }
        });
    }

    // --- Render Functions ---
    function renderCurrentNote() {
        const current = getActiveNote();
        if (!current) return;

        editor.value = current.content || '';
        if (current.htmlContent) {
            richEditor.innerHTML = current.htmlContent;
        } else if (current.content) {
            richEditor.innerHTML = textToHtmlParagraphs(current.content);
        } else {
            richEditor.innerHTML = '';
        }

        noteTitleInput.value = current.title || '';
        currentNoteTitleDisplay.textContent = current.title || 'Untitled Notepad';

        updateLiveStats();
    }

    function renderNoteLists() {
        const filterText = sidebarSearchInput.value.toLowerCase().trim();
        const filteredNotes = notes.filter(n => 
            n.title.toLowerCase().includes(filterText) || 
            (n.content && n.content.toLowerCase().includes(filterText))
        );

        noteCountBadge.textContent = notes.length;

        // 1. Render Top Dropdown List
        dropdownNoteList.innerHTML = '';
        notes.forEach(note => {
            const isActive = note.id === activeNoteId;
            const item = document.createElement('div');
            item.className = `px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors hover:bg-darkBorder/60 ${isActive ? 'bg-darkBorder/80 text-blue-400 font-semibold' : 'text-gray-300'}`;
            item.innerHTML = `
                <div class="truncate flex-1 pr-2">
                    <div class="truncate">${escapeHtml(note.title)}</div>
                    <div class="text-[10px] text-gray-500 font-normal">${formatDate(note.updatedAt)}</div>
                </div>
                ${isActive ? '<i data-lucide="check" class="w-3.5 h-3.5 text-blue-400 shrink-0"></i>' : ''}
            `;
            item.addEventListener('click', () => {
                setActiveNote(note.id);
                noteDropdownMenu.classList.add('hidden');
            });
            dropdownNoteList.appendChild(item);
        });

        // 2. Render Sidebar List
        sidebarNoteList.innerHTML = '';
        if (filteredNotes.length === 0) {
            sidebarNoteList.innerHTML = `<div class="text-xs text-gray-500 p-3 text-center">No notepads found</div>`;
        } else {
            filteredNotes.forEach(note => {
                const isActive = note.id === activeNoteId;
                const plainSnippet = note.content ? note.content.trim().substring(0, 40) : (note.htmlContent ? htmlToCleanPlainText(note.htmlContent).substring(0, 40) : 'Empty notepad...');
                
                const item = document.createElement('div');
                item.className = `p-2.5 rounded-lg text-xs cursor-pointer transition-all border border-transparent group relative ${isActive ? 'note-item-active font-medium border-darkBorder' : 'text-gray-400 hover:bg-darkCard hover:text-gray-200'}`;
                item.innerHTML = `
                    <div class="flex items-center justify-between mb-1">
                        <span class="font-semibold truncate max-w-[125px] min-[400px]:max-w-[145px]">${escapeHtml(note.title)}</span>
                        <div class="flex items-center gap-1 shrink-0">
                            <span class="text-[10px] text-gray-500">${formatDate(note.updatedAt)}</span>
                            <button class="note-more-btn p-1 text-gray-400 hover:text-white rounded hover:bg-darkBorder opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" data-note-id="${note.id}" title="More options">
                                <i data-lucide="more-vertical" class="w-3.5 h-3.5"></i>
                            </button>
                        </div>
                    </div>
                    <div class="text-[11px] text-gray-500 truncate pr-5">${escapeHtml(plainSnippet)}</div>
                `;

                item.addEventListener('click', (e) => {
                    if (e.target.closest('.note-more-btn')) return;
                    setActiveNote(note.id);
                });

                const moreBtn = item.querySelector('.note-more-btn');
                if (moreBtn) {
                    moreBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        activeContextMenuNoteId = note.id;
                        openContextMenu(e.currentTarget);
                    });
                }

                sidebarNoteList.appendChild(item);
            });
        }

        if (window.lucide) lucide.createIcons();
    }

    function updateLiveStats() {
        const text = currentMode === 'plain' ? editor.value : (richEditor.innerText || '');
        const chars = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const lines = text ? text.split('\n').length : 0;
        const mins = Math.ceil(words / 200);

        charCount.textContent = chars.toLocaleString();
        wordCount.textContent = words.toLocaleString();
        lineCount.textContent = lines.toLocaleString();
        readTime.textContent = `${mins} min read`;
    }

    function handleEditorInput() {
        updateLiveStats();

        updateSaveStatusIndicator('Saving...', 'loader');
        
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const current = getActiveNote();
            if (current) {
                current.content = currentMode === 'plain' ? editor.value : htmlToCleanPlainText(richEditor.innerHTML);
                current.htmlContent = currentMode === 'rich' ? richEditor.innerHTML : textToHtmlParagraphs(editor.value);
                current.updatedAt = Date.now();
                saveNotesToStorage();
                renderNoteLists();
            }
        }, 300);
    }

    function handleTitleChange() {
        const current = getActiveNote();
        if (!current) return;

        const newTitle = noteTitleInput.value.trim() || 'Untitled Notepad';
        current.title = newTitle;
        current.updatedAt = Date.now();
        currentNoteTitleDisplay.textContent = newTitle;
        saveNotesToStorage();
        renderNoteLists();
    }

    function applySettings() {
        // Font Family
        editor.classList.remove('font-sans', 'font-mono', 'font-serif');
        editor.classList.add(settings.fontFamily);
        fontFamilySelect.value = settings.fontFamily;

        // Font Size
        editor.style.fontSize = `${settings.fontSize}px`;
        fontSizeRange.value = settings.fontSize;
        modalFontSizeVal.textContent = `${settings.fontSize}px`;
        fontSizeDisplay.textContent = `${settings.fontSize}px`;

        // Line Height
        editor.classList.remove('leading-normal', 'leading-relaxed', 'leading-loose');
        editor.classList.add(settings.lineHeight);
        lineHeightSelect.value = settings.lineHeight;

        // Word Wrap
        if (settings.wordWrap) {
            editor.classList.remove('whitespace-nowrap', 'overflow-x-auto');
            editor.classList.add('overflow-y-auto');
            editor.setAttribute('wrap', 'soft');
        } else {
            editor.classList.add('whitespace-nowrap', 'overflow-x-auto');
            editor.setAttribute('wrap', 'off');
        }
        wordWrapToggle.checked = settings.wordWrap;

        saveSettingsToStorage();
    }

    // --- Search & Replace Engine ---
    function performReplace(replaceAll = false) {
        const query = searchInput.value;
        const replaceText = replaceInput.value;
        if (!query) return;

        const content = editor.value;
        if (replaceAll) {
            const newContent = content.split(query).join(replaceText);
            editor.value = newContent;
        } else {
            const pos = content.indexOf(query);
            if (pos !== -1) {
                editor.value = content.substring(0, pos) + replaceText + content.substring(pos + query.length);
                editor.selectionStart = pos;
                editor.selectionEnd = pos + replaceText.length;
                editor.focus();
            }
        }
        handleEditorInput();
    }

    // --- Export & Download Utilities ---
    function downloadActiveNote() {
        const current = getActiveNote();
        if (!current) return;

        const blob = new Blob([current.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${current.title.replace(/[^a-z0-9_-]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function exportAllNotes() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `notepad_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function copyToClipboard() {
        const text = currentMode === 'plain' ? editor.value : htmlToCleanPlainText(richEditor.innerHTML);
        navigator.clipboard.writeText(text).then(() => {
            copyToast.classList.remove('hidden');
            setTimeout(() => {
                copyToast.classList.add('hidden');
            }, 1500);
        }).catch(err => {
            console.error('Copy failed:', err);
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    }

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // Mode Switcher buttons
        if (modePlainBtn) modePlainBtn.addEventListener('click', () => setEditorMode('plain'));
        if (modeRichBtn) modeRichBtn.addEventListener('click', () => setEditorMode('rich'));

        // Theme Toggle (Light / Dark Mode)
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => toggleTheme());
        }

        // Rich Formatting tools
        if (richBoldBtn) richBoldBtn.addEventListener('click', () => { document.execCommand('bold'); handleEditorInput(); });
        if (richItalicBtn) richItalicBtn.addEventListener('click', () => { document.execCommand('italic'); handleEditorInput(); });
        if (richUnderlineBtn) richUnderlineBtn.addEventListener('click', () => { document.execCommand('underline'); handleEditorInput(); });

        // Setup editors & paste handlers
        setupEditorsAndPaste();

        // Title input edit
        noteTitleInput.addEventListener('input', handleTitleChange);
        noteTitleInput.addEventListener('blur', handleTitleChange);

        // Sidebar Toggle & Mobile Backdrop
        toggleSidebarBtn.addEventListener('click', toggleSidebar);
        if (closeSidebarMobileBtn) {
            closeSidebarMobileBtn.addEventListener('click', closeMobileSidebar);
        }
        if (sidebarBackdrop) {
            sidebarBackdrop.addEventListener('click', closeMobileSidebar);
        }

        // Dropdown toggle
        noteSelectorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            noteDropdownMenu.classList.toggle('hidden');
            if (!noteDropdownMenu.classList.contains('hidden')) {
                noteTitleInput.focus();
            }
        });

        noteTitleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                noteDropdownMenu.classList.add('hidden');
            }
        });

        document.addEventListener('click', (e) => {
            if (!noteDropdownMenu.contains(e.target) && !noteSelectorBtn.contains(e.target)) {
                noteDropdownMenu.classList.add('hidden');
            }
        });

        // New Note Buttons
        newNoteBtn.addEventListener('click', () => createNote());
        sidebarNewBtn.addEventListener('click', () => createNote());
        dropdownNewNoteBtn.addEventListener('click', () => {
            createNote();
            noteDropdownMenu.classList.add('hidden');
        });

        // Actions
        duplicateNoteBtn.addEventListener('click', duplicateActiveNote);
        deleteNoteBtn.addEventListener('click', deleteActiveNote);
        copyTextBtn.addEventListener('click', copyToClipboard);
        downloadBtn.addEventListener('click', downloadActiveNote);
        exportAllBtn.addEventListener('click', exportAllNotes);

        if (cleanFormatBtn) {
            cleanFormatBtn.addEventListener('click', () => {
                const text = editor.value;
                if (!text) return;
                const cleaned = text
                    .replace(/\r\n/g, '\n')
                    .replace(/\r/g, '\n')
                    .replace(/[ \t]+\n/g, '\n')
                    .replace(/\n{3,}/g, '\n\n')
                    .trim();
                editor.value = cleaned;
                handleEditorInput();
            });
        }

        clearAllBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete ALL notepads? This cannot be undone!')) {
                notes = [];
                localStorage.removeItem(STORAGE_KEYS.NOTES);
                createNote('Untitled Notepad', '');
            }
        });

        // Sidebar Search
        if (sidebarSearchInput) {
            sidebarSearchInput.addEventListener('input', renderNoteLists);
        }

        // Search & Replace Widget
        if (toggleSearchBtn) {
            toggleSearchBtn.addEventListener('click', () => {
                searchBar.classList.toggle('hidden');
                if (!searchBar.classList.contains('hidden')) {
                    searchInput.focus();
                    searchInput.select();
                    performSearch();
                }
            });
        }
        if (closeSearchBtn) {
            closeSearchBtn.addEventListener('click', () => {
                searchBar.classList.add('hidden');
                clearSearchHighlights();
            });
        }

        if (toggleReplaceDrawerBtn) {
            toggleReplaceDrawerBtn.addEventListener('click', () => {
                replaceRow.classList.toggle('hidden');
                replaceDrawerIcon.classList.toggle('rotate-90');
            });
        }

        if (matchCaseBtn) {
            matchCaseBtn.addEventListener('click', () => {
                matchCase = !matchCase;
                matchCaseBtn.classList.toggle('bg-blue-600');
                matchCaseBtn.classList.toggle('text-white');
                performSearch();
            });
        }

        if (matchWordBtn) {
            matchWordBtn.addEventListener('click', () => {
                matchWord = !matchWord;
                matchWordBtn.classList.toggle('bg-blue-600');
                matchWordBtn.classList.toggle('text-white');
                performSearch();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', performSearch);
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    navigateMatch(e.shiftKey ? 'prev' : 'next');
                }
            });
        }

        if (prevMatchBtn) prevMatchBtn.addEventListener('click', () => navigateMatch('prev'));
        if (nextMatchBtn) nextMatchBtn.addEventListener('click', () => navigateMatch('next'));

        if (replaceBtn) replaceBtn.addEventListener('click', () => performReplace(false));
        if (replaceAllBtn) replaceAllBtn.addEventListener('click', () => performReplace(true));

        // Settings Modal
        if (toggleSettingsBtn) toggleSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
        if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
        if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

        if (fontFamilySelect) {
            fontFamilySelect.addEventListener('change', (e) => {
                settings.fontFamily = e.target.value;
                applySettings();
            });
        }

        if (fontSizeRange) {
            fontSizeRange.addEventListener('input', (e) => {
                settings.fontSize = parseInt(e.target.value, 10);
                applySettings();
            });
        }

        if (quickFontMinus) {
            quickFontMinus.addEventListener('click', () => {
                if (settings.fontSize > 12) {
                    settings.fontSize--;
                    applySettings();
                }
            });
        }

        if (quickFontPlus) {
            quickFontPlus.addEventListener('click', () => {
                if (settings.fontSize < 32) {
                    settings.fontSize++;
                    applySettings();
                }
            });
        }

        if (lineHeightSelect) {
            lineHeightSelect.addEventListener('change', (e) => {
                settings.lineHeight = e.target.value;
                applySettings();
            });
        }

        if (wordWrapToggle) {
            wordWrapToggle.addEventListener('change', (e) => {
                settings.wordWrap = e.target.checked;
                applySettings();
            });
        }

        // Fullscreen Toggle
        if (toggleFullscreenBtn) {
            toggleFullscreenBtn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => console.error(err));
                } else {
                    document.exitFullscreen().catch(err => console.error(err));
                }
            });
        }

        // Global Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                createNote();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                toggleSidebarBtn.click();
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                if (toggleSearchBtn) toggleSearchBtn.click();
            }
            if (e.key === 'Escape') {
                if (settingsModal) settingsModal.classList.add('hidden');
                if (searchBar) searchBar.classList.add('hidden');
                if (noteDropdownMenu) noteDropdownMenu.classList.add('hidden');
                clearSearchHighlights();
            }
        });
    }

    // --- VS Code Style Find & Replace Engine ---
    function clearSearchHighlights() {
        if (!richEditor) return;
        const marks = richEditor.querySelectorAll('mark.search-highlight, mark.search-highlight-active');
        marks.forEach(mark => {
            const parent = mark.parentNode;
            if (parent) {
                while (mark.firstChild) {
                    parent.insertBefore(mark.firstChild, mark);
                }
                parent.removeChild(mark);
                parent.normalize();
            }
        });
    }

    function performSearch() {
        const query = searchInput.value;
        searchMatches = [];
        currentMatchIndex = -1;
        clearSearchHighlights();

        if (!query) {
            searchStatusText.textContent = '0 results';
            return;
        }

        if (currentMode === 'plain') {
            const text = editor.value || '';
            if (!text) {
                searchStatusText.textContent = 'No results';
                return;
            }

            let flags = 'g';
            if (!matchCase) flags += 'i';

            let pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (matchWord) pattern = `\\b${pattern}\\b`;

            try {
                const regex = new RegExp(pattern, flags);
                let match;
                while ((match = regex.exec(text)) !== null) {
                    searchMatches.push({ index: match.index, length: match[0].length });
                }
            } catch (e) {
                console.warn('Search error:', e);
            }

            if (searchMatches.length > 0) {
                highlightMatch(0);
            } else {
                searchStatusText.textContent = 'No results';
            }
        } else {
            // Rich Text Mode Visual Search & Highlight
            const rawHtml = richEditor.innerHTML;
            if (!rawHtml) {
                searchStatusText.textContent = 'No results';
                return;
            }

            let flags = 'g';
            if (!matchCase) flags += 'i';
            let pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (matchWord) pattern = `\\b${pattern}\\b`;

            try {
                const walker = document.createTreeWalker(richEditor, NodeFilter.SHOW_TEXT, null, false);
                const textNodes = [];
                let node;
                while ((node = walker.nextNode())) {
                    if (node.nodeValue && node.nodeValue.trim()) {
                        textNodes.push(node);
                    }
                }

                textNodes.forEach(tNode => {
                    const regex = new RegExp(pattern, flags);
                    const val = tNode.nodeValue;
                    if (regex.test(val)) {
                        regex.lastIndex = 0;
                        const span = document.createElement('span');
                        span.innerHTML = val.replace(regex, match => `<mark class="search-highlight">${escapeHtml(match)}</mark>`);
                        tNode.parentNode.replaceChild(span, tNode);
                    }
                });

                const highlightMarks = Array.from(richEditor.querySelectorAll('mark.search-highlight'));
                searchMatches = highlightMarks;

                if (highlightMarks.length > 0) {
                    highlightMatch(0);
                } else {
                    searchStatusText.textContent = 'No results';
                }
            } catch (e) {
                console.warn('Rich search error:', e);
                searchStatusText.textContent = 'No results';
            }
        }
    }

    function highlightMatch(index) {
        if (searchMatches.length === 0) {
            searchStatusText.textContent = '0 results';
            return;
        }

        if (index < 0) index = searchMatches.length - 1;
        if (index >= searchMatches.length) index = 0;
        currentMatchIndex = index;

        searchStatusText.textContent = `${index + 1} of ${searchMatches.length}`;

        if (currentMode === 'plain') {
            const match = searchMatches[index];
            editor.focus();
            editor.setSelectionRange(match.index, match.index + match.length);

            // Scroll textarea to match line
            const fullText = editor.value;
            const linesBefore = fullText.substring(0, match.index).split('\n').length;
            const totalLines = Math.max(fullText.split('\n').length, 1);
            const scrollRatio = (linesBefore - 1) / totalLines;
            editor.scrollTop = scrollRatio * editor.scrollHeight;
        } else {
            // Update highlight mark styles & smooth scroll into view
            searchMatches.forEach((mark, i) => {
                if (i === index) {
                    mark.className = 'search-highlight-active';
                    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    mark.className = 'search-highlight';
                }
            });
        }
    }

    function navigateMatch(direction) {
        if (searchMatches.length === 0) return;
        if (direction === 'next') {
            currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
        } else {
            currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
        }
        highlightMatch(currentMatchIndex);
    }

    function performReplace(replaceAll = false) {
        const query = searchInput.value;
        const replaceText = replaceInput.value || '';
        if (!query) return;

        clearSearchHighlights();

        let flags = 'g';
        if (!matchCase) flags += 'i';
        let pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (matchWord) pattern = `\\b${pattern}\\b`;

        const regex = new RegExp(pattern, flags);

        if (currentMode === 'plain') {
            if (replaceAll) {
                editor.value = editor.value.replace(regex, replaceText);
            } else {
                editor.value = editor.value.replace(regex, replaceText);
            }
        } else {
            if (replaceAll) {
                richEditor.innerText = richEditor.innerText.replace(regex, replaceText);
            } else {
                richEditor.innerText = richEditor.innerText.replace(regex, replaceText);
            }
        }

        handleEditorInput();
        performSearch();
    }

    // --- App Initialization ---
    function init() {
        loadFromStorage();
        setupEventListeners();
        applySettings();
        renderCurrentNote();
        renderNoteLists();

        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
