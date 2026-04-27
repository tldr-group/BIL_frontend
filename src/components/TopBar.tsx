import { ReactNode, FC } from "react";
import "../styles/styles.css";

type TopBarButton = {
  text: string;
  outlink?: string;
  onClick?: () => void;
};

type TopBarProps = {
  title: string;
  SearchComponent?: ReactNode;
  buttons: TopBarButton[]; // Should be length 6
};

export const DEFAULT_BUTTONS: TopBarButton[] = [
  { text: "About" },
  { text: "Paper" },
  { text: "Github" },
  { text: "Zenodo" },
  { text: "Contributors" },
  { text: "Contribute" },
];

export const TopBar: FC<TopBarProps> = ({ title, SearchComponent, buttons }) => {
  const nButtons = buttons.length;

  return (
    <div className="topbar-root">
      <div className="topbar-row">
        <div className="topbar-title-search">
          <h2>{title}</h2>
          {SearchComponent && <span>{SearchComponent}</span>}
        </div>
        <div className="topbar-buttons-grid">
          <div className="topbar-buttons-row">
            {buttons.slice(0, Math.floor(nButtons / 2)).map((btn, idx) => (
              <TopBarButtonComp key={"top-" + idx} {...btn} />
            ))}
          </div>
          <div className="topbar-buttons-row">
            {buttons.slice(Math.floor(nButtons / 2), nButtons).map((btn, idx) => (
              <TopBarButtonComp key={"bottom-" + idx} {...btn} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TopBarButtonComp: FC<TopBarButton> = ({ text, outlink, onClick }) => {
  if (!text) return <button className="topbar-btn topbar-btn-hidden" />;
  if (outlink) {
    return (
      <a href={outlink} target="_blank" rel="noopener noreferrer" className="topbar-btn">
        {text}
      </a>
    );
  }
  return (
    <button onClick={onClick} className="topbar-btn" disabled={!onClick}>
      {text}
    </button>
  );
};
