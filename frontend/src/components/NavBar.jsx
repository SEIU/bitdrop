import { Link } from "react-router";
import logo from "../branding/app-logo.svg";
import { AppBar, Box, Toolbar, Typography } from "@mui/material";

const linkStyle = {
  textDecoration: "none",
  color: "inherit",
};

const appName = import.meta.env.VITE_APP_NAME;

export default function NavBar() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="secondary">
        <Toolbar>
          <Link to="/" style={linkStyle}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <img src={logo} style={{ width: "120px" }} />
              <Typography
                variant="h6"
                component="div"
                sx={{ flexGrow: 1, marginLeft: "15px" }}
              >
                {appName}
              </Typography>
            </Box>
          </Link>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
