import { createElement, clearElement, createText } from '../utils/dom-helpers';
import { createSVGIcon } from '../utils/icons';
import { httpClient } from '../api/http.client';

export interface ParsedDocument {
    documentId: string;
    structure: any;
    textContent: string;
    metadata: {
        filename: string;
        filesize: number;
        document_type: string;
        page_count?: number;
    };
}

export type ExportFormat = 'text' | 'markdown' | 'json' | 'excel';

export class DocumentParser {
    private triggerButton: HTMLElement | null = null;
    private panel: HTMLElement | null = null;
    private isOpen: boolean = false;
    private currentDocument: ParsedDocument | null = null;
    private currentTab: ExportFormat = 'text';

    constructor() {}

    /**
     * Create trigger button for chat list
     */
    createTriggerButton(): HTMLElement {
        this.triggerButton = createElement('div', {
            className: 'document-parser-trigger',
            styles: {
                padding: '16px 20px',
                borderBottom: '1px solid #2d3748',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#1a2332',
                transition: 'background-color 0.2s ease'
            }
        });

        // Icon
        const iconWrapper = createElement('div', {
            styles: {
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }
        });
        const icon = createSVGIcon('document', 20, 20);
        icon.style.color = '#ffffff';
        iconWrapper.appendChild(icon);

        // Text
        const textWrapper = createElement('div', { styles: { flex: '1' } });
        const title = createElement('div', {
            text: 'Умный парсер',
            styles: {
                fontWeight: '600',
                fontSize: '15px',
                color: '#e1e9f0',
                marginBottom: '2px'
            }
        });
        const subtitle = createElement('div', {
            text: 'PDF, DOCX, XLSX, TXT',
            styles: {
                fontSize: '13px',
                color: '#718096'
            }
        });
        textWrapper.appendChild(title);
        textWrapper.appendChild(subtitle);

        this.triggerButton.appendChild(iconWrapper);
        this.triggerButton.appendChild(textWrapper);

        // Hover effect
        this.triggerButton.addEventListener('mouseenter', () => {
            this.triggerButton!.style.backgroundColor = '#202938';
        });
        this.triggerButton.addEventListener('mouseleave', () => {
            this.triggerButton!.style.backgroundColor = '#1a2332';
        });

        // Click handler
        this.triggerButton.addEventListener('click', () => {
            this.togglePanel();
        });

        return this.triggerButton;
    }

    /**
     * Toggle panel visibility
     */
    togglePanel(): void {
        if (this.isOpen) {
            this.closePanel();
        } else {
            this.openPanel();
        }
    }

    /**
     * Open side panel
     */
    openPanel(): void {
        if (!this.panel) {
            this.panel = this.createPanel();
            document.body.appendChild(this.panel);
        }

        this.panel.classList.add('open');
        this.isOpen = true;
    }

    /**
     * Close side panel
     */
    closePanel(): void {
        if (this.panel) {
            this.panel.classList.remove('open');
        }
        this.isOpen = false;
    }

    /**
     * Create side panel
     */
    private createPanel(): HTMLElement {
        const panel = createElement('div', {
            className: 'document-parser-panel',
            styles: {
                position: 'fixed',
                top: '0',
                right: '-500px',
                width: '500px',
                height: '100vh',
                backgroundColor: '#1a2332',
                boxShadow: '-2px 0 10px rgba(0, 0, 0, 0.3)',
                zIndex: '1000',
                transition: 'right 0.3s ease',
                display: 'flex',
                flexDirection: 'column'
            }
        });

        // Add 'open' class handler
        const style = document.createElement('style');
        style.textContent = `
            .document-parser-panel.open {
                right: 0 !important;
            }
        `;
        document.head.appendChild(style);

        // Header
        const header = this.createPanelHeader();
        panel.appendChild(header);

        // Upload area
        const uploadArea = this.createUploadArea();
        panel.appendChild(uploadArea);

        // Results area (hidden by default)
        const resultsArea = this.createResultsArea();
        panel.appendChild(resultsArea);

        return panel;
    }

    /**
     * Create panel header
     */
    private createPanelHeader(): HTMLElement {
        const header = createElement('div', {
            styles: {
                padding: '20px',
                borderBottom: '1px solid #2d3748',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }
        });

        const title = createElement('h2', {
            text: 'Парсер документов',
            styles: {
                margin: '0',
                fontSize: '18px',
                fontWeight: '600',
                color: '#e1e9f0'
            }
        });

        const closeButton = createElement('button', {
            className: 'close-button',
            styles: {
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#718096',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
            }
        });

        const closeIcon = createSVGIcon('close', 20, 20);
        closeButton.appendChild(closeIcon);

        closeButton.addEventListener('click', () => this.closePanel());
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.backgroundColor = '#2d3748';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.backgroundColor = 'transparent';
        });

        header.appendChild(title);
        header.appendChild(closeButton);

        return header;
    }

    /**
     * Create upload area
     */
    private createUploadArea(): HTMLElement {
        const container = createElement('div', {
            className: 'upload-container',
            styles: {
                padding: '20px',
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }
        });

        // Drop zone
        const dropZone = createElement('div', {
            className: 'drop-zone',
            styles: {
                border: '2px dashed #4a5568',
                borderRadius: '12px',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backgroundColor: '#202938'
            }
        });

        const dropIcon = createSVGIcon('upload', 48, 48);
        dropIcon.style.color = '#667eea';
        dropIcon.style.marginBottom = '16px';

        const dropText = createElement('p', {
            text: 'Перетащите файл сюда или нажмите для выбора',
            styles: {
                margin: '0',
                color: '#e1e9f0',
                fontSize: '14px',
                marginBottom: '8px'
            }
        });

        const dropHint = createElement('p', {
            text: 'Поддерживаются: PDF, DOCX, XLSX, TXT',
            styles: {
                margin: '0',
                color: '#718096',
                fontSize: '12px'
            }
        });

        dropZone.appendChild(dropIcon);
        dropZone.appendChild(dropText);
        dropZone.appendChild(dropHint);

        // File input (hidden)
        const fileInput = createElement('input', {
            attributes: {
                type: 'file',
                accept: '.pdf,.docx,.xlsx,.txt',
                id: 'document-file-input'
            },
            styles: { display: 'none' }
        }) as HTMLInputElement;

        // Click to select file
        dropZone.addEventListener('click', () => fileInput.click());

        // Drag & drop handlers
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#667eea';
            dropZone.style.backgroundColor = '#2d3748';
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = '#4a5568';
            dropZone.style.backgroundColor = '#202938';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#4a5568';
            dropZone.style.backgroundColor = '#202938';

            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        // File input change
        fileInput.addEventListener('change', (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        container.appendChild(dropZone);
        container.appendChild(fileInput);

        return container;
    }

    /**
     * Create results area
     */
    private createResultsArea(): HTMLElement {
        const container = createElement('div', {
            className: 'results-container',
            styles: {
                display: 'none',
                flexDirection: 'column',
                flex: '1',
                overflow: 'hidden'
            }
        });

        // Tabs
        const tabs = this.createTabs();
        container.appendChild(tabs);

        // Content area
        const content = createElement('div', {
            className: 'results-content',
            styles: {
                flex: '1',
                overflow: 'auto',
                padding: '20px',
                backgroundColor: '#141b26'
            }
        });
        container.appendChild(content);

        // Action buttons
        const actions = this.createActionButtons();
        container.appendChild(actions);

        return container;
    }

    /**
     * Create tabs for export formats
     */
    private createTabs(): HTMLElement {
        const tabsContainer = createElement('div', {
            styles: {
                display: 'flex',
                borderBottom: '1px solid #2d3748',
                padding: '0 20px',
                gap: '8px'
            }
        });

        const formats: ExportFormat[] = ['text', 'markdown', 'json', 'excel'];
        const labels = {
            text: 'Text',
            markdown: 'Markdown',
            json: 'JSON',
            excel: 'Excel'
        };

        formats.forEach(format => {
            const tab = createElement('button', {
                className: `tab-button ${format === this.currentTab ? 'active' : ''}`,
                text: labels[format],
                styles: {
                    padding: '12px 20px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: format === this.currentTab ? '#667eea' : '#718096',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    borderBottom: format === this.currentTab ? '2px solid #667eea' : '2px solid transparent',
                    transition: 'all 0.2s ease'
                }
            });

            tab.addEventListener('click', () => this.switchTab(format));

            tabsContainer.appendChild(tab);
        });

        return tabsContainer;
    }

    /**
     * Create action buttons
     */
    private createActionButtons(): HTMLElement {
        const container = createElement('div', {
            styles: {
                padding: '20px',
                borderTop: '1px solid #2d3748',
                display: 'flex',
                gap: '12px'
            }
        });

        // Download button
        const downloadBtn = createElement('button', {
            text: 'Скачать',
            styles: {
                flex: '1',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#667eea',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }
        });

        downloadBtn.addEventListener('click', () => this.handleDownload());

        // Copy button
        const copyBtn = createElement('button', {
            text: 'Копировать',
            styles: {
                flex: '1',
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #4a5568',
                backgroundColor: 'transparent',
                color: '#e1e9f0',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }
        });

        copyBtn.addEventListener('click', () => this.handleCopy());

        container.appendChild(downloadBtn);
        container.appendChild(copyBtn);

        return container;
    }

    /**
     * Handle file upload
     */
    private async handleFileUpload(file: File): Promise<void> {
        try {
            // Show loading state
            this.showLoading();

            // Create FormData
            const formData = new FormData();
            formData.append('file', file);

            // Upload and parse
            const response = await httpClient.post('/api/parser/parse', formData);

            if (response.success && response.data) {
                this.currentDocument = {
                    documentId: response.data.document_id,
                    structure: response.data.structure,
                    textContent: response.data.text_content,
                    metadata: response.data.structure.metadata
                };

                // Show results
                this.showResults();
            } else {
                this.showError(response.error || 'Failed to parse document');
            }
        } catch (error: any) {
            this.showError(error.message || 'Upload failed');
        }
    }

    /**
     * Switch tab
     */
    private async switchTab(format: ExportFormat): Promise<void> {
        this.currentTab = format;

        // Update tab buttons
        const tabs = this.panel?.querySelectorAll('.tab-button');
        tabs?.forEach(tab => {
            const button = tab as HTMLElement;
            const isActive = button.textContent?.toLowerCase() === format;
            button.style.color = isActive ? '#667eea' : '#718096';
            button.style.borderBottom = isActive ? '2px solid #667eea' : '2px solid transparent';
        });

        // Load export content
        await this.loadExportContent(format);
    }

    /**
     * Load export content
     */
    private async loadExportContent(format: ExportFormat): Promise<void> {
        if (!this.currentDocument) return;

        try {
            const response = await httpClient.post('/api/parser/export', {
                documentId: this.currentDocument.documentId,
                format: format
            });

            if (response.success && response.data) {
                const contentArea = this.panel?.querySelector('.results-content');
                if (contentArea) {
                    clearElement(contentArea);

                    if (format === 'excel' && response.data.download_url) {
                        // Show download link for Excel
                        const link = createElement('a', {
                            text: 'Скачать Excel файл',
                            attributes: {
                                href: response.data.download_url,
                                download: `${this.currentDocument.metadata.filename}.xlsx`
                            },
                            styles: {
                                color: '#667eea',
                                textDecoration: 'underline'
                            }
                        });
                        contentArea.appendChild(link);
                    } else {
                        // Show content
                        const pre = createElement('pre', {
                            text: response.data.content,
                            styles: {
                                margin: '0',
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word',
                                color: '#e1e9f0',
                                fontSize: '13px',
                                lineHeight: '1.6'
                            }
                        });
                        contentArea.appendChild(pre);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load export content:', error);
        }
    }

    /**
     * Handle download
     */
    private handleDownload(): void {
        // Download current export format
        const contentArea = this.panel?.querySelector('.results-content pre');
        if (contentArea) {
            const content = contentArea.textContent || '';
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `document.${this.currentTab}`;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Handle copy
     */
    private async handleCopy(): Promise<void> {
        const contentArea = this.panel?.querySelector('.results-content pre');
        if (contentArea) {
            const content = contentArea.textContent || '';
            try {
                await navigator.clipboard.writeText(content);
                alert('Скопировано в буфер обмена');
            } catch (error) {
                console.error('Failed to copy:', error);
            }
        }
    }

    /**
     * Show loading state
     */
    private showLoading(): void {
        // Hide upload area
        const uploadContainer = this.panel?.querySelector('.upload-container') as HTMLElement;
        if (uploadContainer) uploadContainer.style.display = 'none';

        // Show loading in results area
        const resultsContainer = this.panel?.querySelector('.results-container') as HTMLElement;
        if (resultsContainer) {
            resultsContainer.style.display = 'flex';
            const content = resultsContainer.querySelector('.results-content');
            if (content) {
                clearElement(content);
                const loading = createElement('div', {
                    text: 'Обработка документа...',
                    styles: {
                        textAlign: 'center',
                        color: '#718096',
                        padding: '40px'
                    }
                });
                content.appendChild(loading);
            }
        }
    }

    /**
     * Show results
     */
    private showResults(): void {
        const resultsContainer = this.panel?.querySelector('.results-container') as HTMLElement;
        if (resultsContainer) {
            resultsContainer.style.display = 'flex';
        }

        // Load initial tab content
        this.loadExportContent(this.currentTab);
    }

    /**
     * Show error
     */
    private showError(message: string): void {
        const uploadContainer = this.panel?.querySelector('.upload-container') as HTMLElement;
        if (uploadContainer) uploadContainer.style.display = 'flex';

        const resultsContainer = this.panel?.querySelector('.results-container') as HTMLElement;
        if (resultsContainer) resultsContainer.style.display = 'none';

        alert(`Ошибка: ${message}`);
    }
}

export const documentParser = new DocumentParser();
