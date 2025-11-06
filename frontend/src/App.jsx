import { Outlet } from "react-router";
import NavBar from "./components/NavBar";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./components/ErrorFallback";

import "./App.css";

function App() {
  return (
    <>
      <NavBar />
      <ErrorBoundary
        fallbackRender={({ error }) => (
          <ErrorFallback error={error} redirect="/" />
        )}
      >
        <Outlet />
      </ErrorBoundary>
    </>
  );
}

export default App;
