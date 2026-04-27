import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
// we have to use HashRouter instead of BrowserRouter as are hosted on GitHub Pages, which doesn't support client-side routing without a server configuration
import { HashRouter } from "react-router-dom";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
