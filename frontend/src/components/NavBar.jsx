import { Link } from "react-router";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

const linkStyle = {
  textDecoration: "none",
  color: "inherit",
};

export default function NavBar() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ backgroundColor: "#664697" }}>
        <Toolbar>
          <Link to="/" style={linkStyle}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <img
                src="/seiu-logo.svg"
                alt="seiu logo"
                style={{ width: "120px" }}
              />
              <Typography
                variant="h6"
                component="div"
                sx={{ flexGrow: 1, marginLeft: "15px" }}
              >
                Bitdrop
              </Typography>
            </Box>
          </Link>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
