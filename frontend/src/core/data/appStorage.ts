export interface IStorageLocal {
    get: (k: string) => any;
    set: (k: string, v: any) => void;
    setString: (k: string, v: any) => void;
    getString: (k: string) => string | null;
    remove: (k: string) => void;
    clear: () => void;
}

export interface IStorageSession {
    get: (k: string) => any;
    set: (k: string, v: any) => void;
    getString: (k: string) => string | null;
    remove: (k: string) => void;
    clear: () => void;
}

export const appStorage = () => {
    const local: IStorageLocal = {
        get(k: string) {
            try {
                return JSON.parse(localStorage.getItem(k) as string);
            } catch (e) {
                console.error('Error getting local storage:', e);
                return null;
            }
        },

        set(k: string, v: any) {
            localStorage.setItem(k, JSON.stringify(v));
        },

        setString(k: string, v: any) {
            localStorage.setItem(k, v);
        },

        getString(k: string) {
            try {
                return localStorage.getItem(k);
            } catch (e) {
                console.error('Error getting local storage:', e);
                return null;
            }
        },
        remove(k: string) {
            try {
                return localStorage.removeItem(k);
            } catch (e) {
                console.error('Error removing local storage:', e);
                return null;
            }
        },
        clear() {
            try {
                return localStorage.clear();
            } catch (e) {
                console.error('Error clearing local storage:', e);
                return null;
            }
        }
    };

    const session: IStorageSession = {
        get(k: string) {
            try {
                return JSON.parse(sessionStorage.getItem(k) as string);
            } catch (e) {
                console.error('Error getting session storage:', e);
                return null;
            }
        },

        set(k: string, v: any) {
            sessionStorage.setItem(k, JSON.stringify(v));
        },

        getString(k: string) {
            try {
                return sessionStorage.getItem(k);
            } catch (e) {
                console.error('Error getting session storage:', e);
                return null;
            }
        },
        remove(k: string) {
            try {
                return sessionStorage.removeItem(k);
            } catch (e) {
                console.error('Error removing session storage:', e);
                return null;
            }
        },
        clear() {
            try {
                return sessionStorage.clear();
            } catch (e) {
                console.error('Error clearing session storage:', e);
                return null;
            }
        }
    };

    return {
        local,
        session
    };
};
