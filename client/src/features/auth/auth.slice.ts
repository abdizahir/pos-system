import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// When the user last used the app (see useIdleLogout)
export const LAST_ACTIVITY_KEY = "lastActivity";

interface AuthState {
  token: string | null;
}

const initialState: AuthState = {
  token: localStorage.getItem("token"),
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      localStorage.setItem("token", action.payload);
      // A fresh sign-in starts the inactivity timer again
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    },

    clearToken: (state) => {
      state.token = null;
      localStorage.removeItem("token");
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    },
  },
});

export const { setToken, clearToken } = authSlice.actions;

export default authSlice.reducer;