import {FC, useContext, useEffect, useState, useMemo} from "react";
import {Routes, Route, Navigate, Outlet, useLocation, useNavigate} from "react-router-dom";
import AppContext from "./interfaces/types";
import ScanModal from "./components/ScanModal";
import ContributeModal from "./components/ContributeModal";

import HeroFold from "./components/HeroFold";
import ExampleCards from "./components/ExampleCard";
import SearchCard from "./components/SearchCard";
import {Container} from "react-bootstrap";

import "./assets/scss/App.scss";
import "bootstrap/dist/css/bootstrap.min.css";
import {scanMatchesSearch, smartShuffle} from "./interfaces/helpers";
import ContributorModal from "./components/ContributorModal";
import {FloatingButtons} from "./components/HeroButtons";
import AboutModal from "./components/AboutModal";
import ExportModal from "./components/ExportModal";

export const App: FC = () => {
    const {
        scanData: [scanData],
        searchText: [searchText],
        selectedModalities: [selectedModalities],
        resRange: [resRange],
        sizeRange: [sizeRange],
        selectedScan: [selectedScan, setSelectedScan],
        showContribute: [showContribute, setShowContribute],
        showContributors: [showContributors, setShowContributors],
        showAbout: [showAbout, setShowAbout],
        isSearching: [isSearching, setIsSearching],
        selectedScanIds: [selectedScanIds, setSelectedScanIds]
    } = useContext(AppContext)!;

    const navigate = useNavigate();
    const location = useLocation();
    // Memoize state, update when modal states change
    const state = useMemo(
        () => location.state as {background?: Location},
        [location, showContribute, showContributors, showAbout]
    );

    const goBack = () => {
        setSelectedScan(null);
        setIsSearching(true);
        navigate("search");
    };

    const handleToggleSelect = (scanID: number) => {
        setSelectedScanIds((prev) =>
            prev.includes(scanID) ? prev.filter((id) => id !== scanID) : [...prev, scanID]
        );
    };

    // Filter and shuffle scans matching current search parameters
    const matchingScans = useMemo(() => {
        return scanData.filter((s) =>
            scanMatchesSearch(s, searchText, resRange, sizeRange, selectedModalities)
        );
    }, [scanData, searchText, resRange, sizeRange, selectedModalities]);

    const displayedScans = useMemo(() => {
        return smartShuffle(matchingScans, ["scanModality", "sampleID"]);
    }, [matchingScans]);

    // Determine if current route is '/search'
    useEffect(() => {
        if (location.pathname.includes("search")) {
            setIsSearching(true);
        } else if (
            location.pathname === "" ||
            location.pathname === "/" ||
            location.pathname === "home" ||
            location.pathname === "/home"
        ) {
            setIsSearching(false);
        }
    }, [location.pathname, setIsSearching]);

    return (
        <div className="app">
            <HeroFold searching={isSearching} />
            <FloatingButtons />
            <Routes location={state?.background || location}>
                <Route path="" element={<ExampleCards />} />
                <Route path="home" element={<Navigate to="/" replace />} />
                <Route
                    path="search"
                    element={
                        <Container className="my-5">
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "row",
                                    flexWrap: "wrap",
                                    justifyContent: "space-evenly",
                                    gap: 18,
                                    alignItems: "stretch"
                                }}
                            >
                                {displayedScans.map((v, i) => (
                                    <div
                                        key={v.scanID || i}
                                        onClick={() => {
                                            setSelectedScan(v);
                                            navigate(`search/${v.scanID}`);
                                        }}
                                        style={{cursor: "pointer"}}
                                    >
                                        <SearchCard
                                            scan={v}
                                            isSelected={selectedScanIds.includes(v.scanID)}
                                            onToggleSelect={handleToggleSelect}
                                        />
                                    </div>
                                ))}
                            </div>
                        </Container>
                    }
                />
                <Route path="/search/:id" element={<ScanModal show={true} onClose={goBack} />} />
            </Routes>

            <Outlet />
            {state?.background && (
                <Routes>
                    <Route path="search/:id" element={<ScanModal show={true} onClose={goBack} />} />
                </Routes>
            )}
            {/* Contribute Modal */}
            {showContribute && (
                <ContributeModal show={showContribute} onClose={() => setShowContribute(false)} />
            )}
            {showContributors && (
                <ContributorModal
                    show={showContributors}
                    onClose={() => setShowContributors(false)}
                />
            )}
            {showAbout && <AboutModal show={showAbout} onClose={() => setShowAbout(false)} />}
        </div>
    );
};

export default App;
