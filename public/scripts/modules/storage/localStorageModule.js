// Function to store token in the local storage
function storeTokenInLocalStorage(token) {
    try {
        if (typeof Storage !== "undefined") {
            localStorage.setItem(token_key_name, token);
        } else {
            console.warn("Local storage is not available in this browser.");
        }
    } catch (error) {
        console.error("Error storing Token in local storage:", error);
    }
}

// Function to retrieve token from the local storage
function getTokenFromLocalStorage() {
    try {
        if (typeof Storage !== "undefined") {
            const token = localStorage.getItem(token_key_name);
            if (token) {
                return token;
            } else {
                console.warn("Token not found in local storage.");
                return null;
            }
        } else {
            console.warn("Local storage is not available in this browser.");
            return null;
        }
    } catch (error) {
        console.error("Error retrieving token from local storage:", error);
        return null;
    }
}

// Function to clear token from the local storage
function clearTokenFromLocalStorage() {
    try {
        if (typeof Storage !== "undefined") {
            localStorage.removeItem(token_key_name);
        } else {
            console.warn("Local storage is not available in this browser.");
        }
    } catch (error) {
        console.error("Error clearing Token from local storage:", error);
    }
}