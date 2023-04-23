import axios from "axios";

// Map for localStorage keys
const GOOGLE_LOCALSTORAGE_KEYS = {
  accessToken: "google_access_token",
  refreshToken: "google_refresh_token",
  expireTime: "google_token_expire_time",
  timestamp: "google_token_timestamp",
};

// Map to retrieve Google localStorage values
const LOCALSTORAGE_VALUES = {
  accessToken: window.localStorage.getItem(
    GOOGLE_LOCALSTORAGE_KEYS.accessToken
  ),
  refreshToken: window.localStorage.getItem(
    GOOGLE_LOCALSTORAGE_KEYS.refreshToken
  ),
  expireTime: window.localStorage.getItem(GOOGLE_LOCALSTORAGE_KEYS.expireTime),
  timestamp: window.localStorage.getItem(GOOGLE_LOCALSTORAGE_KEYS.timestamp),
};

/**
 * Clear out all localStorage items we've set and reload the page
 * @returns {void}
 */
export const logout = () => {
  // Clear all localStorage items
  for (const property in GOOGLE_LOCALSTORAGE_KEYS) {
    window.localStorage.removeItem(GOOGLE_LOCALSTORAGE_KEYS[property]);
  }
  // Navigate to homepage
  window.location = window.location.origin;
};

/**
 * Checks if the amount of time that has elapsed between the timestamp in localStorage
 * and now is greater than the expiration time of 3600 seconds (1 hour).
 * @returns {boolean} Whether or not the access token in localStorage has expired
 */
const hasTokenExpired = () => {
  const { accessToken, timestamp, expireTime } = LOCALSTORAGE_VALUES;
  if (!accessToken || !timestamp) {
    return false;
  }
  const millisecondsElapsed = Date.now() - Number(timestamp);
  return millisecondsElapsed / 1000 > Number(expireTime);
};

/**
 * Use the refresh token in localStorage to hit the /refresh_token endpoint
 * in our Node app, then update values in localStorage with data from response.
 * @returns {void}
 */
const refreshToken = async () => {
  try {
    // Logout if there's no refresh token stored or we've managed to get into a reload infinite loop
    if (
      !LOCALSTORAGE_VALUES.refreshToken ||
      LOCALSTORAGE_VALUES.refreshToken === "undefined" ||
      Date.now() - Number(LOCALSTORAGE_VALUES.timestamp) / 1000 < 1000
    ) {
      console.error("No refresh token available");
      logout();
    }

    // Use `/refresh_token` endpoint from our Node app
    const { data } = await axios.get(
      `/refresh_token?refresh_token=${LOCALSTORAGE_VALUES.refreshToken}`
    );

    // Update localStorage values
    window.localStorage.setItem(
      GOOGLE_LOCALSTORAGE_KEYS.accessToken,
      data.access_token
    );
    window.localStorage.setItem(GOOGLE_LOCALSTORAGE_KEYS.timestamp, Date.now());

    // Reload the page for localStorage updates to be reflected
    window.location.reload();
  } catch (e) {
    console.error(e);
  }
};

/**
 * Handles logic for retrieving the Spotify access token from localStorage
 * or URL query params
 * @returns {string} A Spotify access token
 */
const getAccessToken = () => {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const queryParams = {
    [GOOGLE_LOCALSTORAGE_KEYS.accessToken]: urlParams.get("access_token"),
    [GOOGLE_LOCALSTORAGE_KEYS.refreshToken]: urlParams.get("refresh_token"),
    [GOOGLE_LOCALSTORAGE_KEYS.expireTime]: urlParams.get("expires_in"),
  };
  const hasError = urlParams.get("error");

  // If there's an error OR the token in localStorage has expired, refresh the token
  if (
    hasError ||
    hasTokenExpired() ||
    LOCALSTORAGE_VALUES.accessToken === "undefined"
  ) {
    refreshToken();
  }

  // If there is a valid access token in localStorage, use that
  if (
    LOCALSTORAGE_VALUES.accessToken &&
    LOCALSTORAGE_VALUES.accessToken !== "undefined"
  ) {
    return LOCALSTORAGE_VALUES.accessToken;
  }

  // If there is a token in the URL query params, user is logging in for the first time
  if (queryParams[GOOGLE_LOCALSTORAGE_KEYS.accessToken]) {
    // Store the query params in localStorage
    for (const property in queryParams) {
      window.localStorage.setItem(property, queryParams[property]);
    }
    // Set timestamp
    window.localStorage.setItem(GOOGLE_LOCALSTORAGE_KEYS.timestamp, Date.now());
    // Return access token from query params
    return queryParams[GOOGLE_LOCALSTORAGE_KEYS.accessToken];
  }

  // We should never get here!
  return false;
};

export const googleAccessToken = getAccessToken();

/**
 * Axios global request headers
 * https://github.com/axios/axios#global-axios-defaults
 */
axios.defaults.baseURL = "https://www.googleapis.com/youtube/v3";
axios.defaults.headers["Authorization"] = `Bearer ${googleAccessToken}`;
axios.defaults.headers["Content-Type"] = "application/json";

