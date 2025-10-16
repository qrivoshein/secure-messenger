// Media Loader Service - loads protected media files with authentication

import { httpClient } from '../api/http.client';
import { config } from '../config';

export class MediaLoaderService {
    private blobCache: Map<string, string> = new Map();

    /**
     * Load a protected media file and return a blob URL
     * @param mediaUrl - The API URL (e.g., /api/file/filename.jpg)
     * @returns Blob URL that can be used in img src, video src, etc.
     */
    async loadMedia(mediaUrl: string): Promise<string> {
        // Check cache first
        if (this.blobCache.has(mediaUrl)) {
            const cachedUrl = this.blobCache.get(mediaUrl)!;
            return cachedUrl;
        }

        try {
            // Fetch with authorization
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token');
            }

            const fullUrl = mediaUrl.startsWith('http') 
                ? mediaUrl 
                : `${config.apiUrl}${mediaUrl}`;

            const response = await fetch(fullUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load media: ${response.status}`);
            }

            // Get blob from response
            const blob = await response.blob();
            
            // Create blob URL
            const blobUrl = URL.createObjectURL(blob);
            
            // Cache it
            this.blobCache.set(mediaUrl, blobUrl);
            
            return blobUrl;
        } catch (error) {
            console.error('Error loading media:', error);
            throw error;
        }
    }

    /**
     * Preload multiple media files
     */
    async preloadMedia(mediaUrls: string[]): Promise<void> {
        const promises = mediaUrls.map(url => this.loadMedia(url).catch(err => {
            console.error(`Failed to preload ${url}:`, err);
        }));
        await Promise.all(promises);
    }

    /**
     * Revoke a blob URL to free memory
     */
    revokeMedia(mediaUrl: string): void {
        const blobUrl = this.blobCache.get(mediaUrl);
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            this.blobCache.delete(mediaUrl);
        }
    }

    /**
     * Clear all cached blob URLs
     */
    clearCache(): void {
        this.blobCache.forEach(blobUrl => {
            URL.revokeObjectURL(blobUrl);
        });
        this.blobCache.clear();
    }

    /**
     * Check if media is cached
     */
    isCached(mediaUrl: string): boolean {
        return this.blobCache.has(mediaUrl);
    }
}

export const mediaLoader = new MediaLoaderService();
