// HTTP API client for backend communication

export class HttpClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string = window.location.origin) {
        this.baseUrl = baseUrl;
    }

    setToken(token: string | null) {
        this.token = token;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    }

    async login(username: string, password: string) {
        return this.request<{
            token: string;
            username: string;
            userId: string;
        }>('/api/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    }

    async register(username: string, password: string) {
        return this.request<{
            userId: string;
            username: string;
        }>('/api/register', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    }

    async getUsers() {
        return this.request<{
            users: Array<{ username: string; userId: string }>;
        }>('/api/users');
    }

    async getMessages(otherUser: string) {
        return this.request<{
            messages: any[];
        }>(`/api/messages/${otherUser}`);
    }

    async sendMessage(to: string, messageData: any) {
        return this.request<{
            messageId: string;
            message: any;
        }>('/api/messages', {
            method: 'POST',
            body: JSON.stringify({ to, ...messageData }),
        });
    }

    async searchUsers(query: string) {
        return this.request<{
            users: Array<{ username: string; userId: string }>;
        }>(`/api/users/search?q=${encodeURIComponent(query)}`);
    }

    async uploadFile(file: File, to: string): Promise<{ fileUrl: string; fileName: string; fileSize: number }> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('to', to);

        const headers: HeadersInit = {};
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseUrl}/api/upload`, {
            method: 'POST',
            headers,
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Upload failed');
        }

        return data;
    }
}

export const httpClient = new HttpClient();
