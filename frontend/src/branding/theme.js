import { createTheme } from "@mui/material/styles";

export const customTheme = createTheme({
  palette: {
    primary: {
      main: "#72a3d2",
      light: "#A3C4E0", // Used for lighter effects
      dark: "#5A81A4", // Used for hover/active states

      contrastText: "#ffffff",
    },

    secondary: {
      main: "#664697",
      contrastText: "#ffffff",
    },
  },

  components: {
    MuiButton: {
      defaultProps: {
        color: "primary",
        variant: "contained",
      },
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
  },
});
