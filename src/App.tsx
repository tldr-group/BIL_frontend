import { useState } from "react";
import { Routes, Route } from "react-router-dom";

import { TopBar, DEFAULT_BUTTONS } from "./components/TopBar";
import { SearchElement } from "./components/SearchElement";

import { HomePage } from "./components/HomePage";
import { DynamicContent } from "./components/DynamicContent";

import "./styles/styles.css";

export const App = () => {
  const [searchText, setSearchText] = useState("");

  const searchComponent = <SearchElement searchText={searchText} setSearchText={setSearchText} />;

  return (
    <div className="container">
      <TopBar title={"Example Updatable Site"} SearchComponent={searchComponent} buttons={DEFAULT_BUTTONS} />

      <div style={{ paddingTop: "2em", maxWidth: "95%" }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="search" element={<DynamicContent searchText={searchText} />} />
        </Routes>
      </div>
    </div>
  );
};
