import { createTheme } from "@mui/material/styles";

export const seiuTheme = createTheme({
  palette: {
    seiuColors: {
      purple: "#664697",
      blue: "#72a3d2",
    },

    primary: {
      main: "#72a3d2",

      light: "#A3C4E0", // Used for lighter effects
      dark: "#5A81A4", // Used for hover/active states

      contrastText: "#ffffff",
    },

    secondary: {
      main: "#664697", // SEIU Purple
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
