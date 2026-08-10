import {FC, useState, ReactNode} from "react";
import {Container, Card, Button} from "react-bootstrap";

const updatesData: ReactNode[] = [
    <span key="1">
        <b>10/08/2026:</b> Added bulk download option for selected scans.
    </span>,
    <span key="2">
        <b>30/03/2026:</b> Migrate to Cloudflare; automated builds.
    </span>,
    <span key="3">
        <b>30/09/2025:</b> Initial release of the website - check out the{" "}
        <a
            href="https://chemrxiv.org/engage/chemrxiv/article-details/68d3b52b3e708a7649ffd0a5"
            target="_blank"
            rel="noopener noreferrer"
        >
            preprint
        </a>
        !
    </span>
];

const N_BEFORE_HIDE = 4;

const Updates: FC = () => {
    const [expanded, setExpanded] = useState<boolean>(false);

    const displayedUpdates = expanded ? updatesData : updatesData.slice(0, N_BEFORE_HIDE);

    return (
        <Container style={{marginTop: 16}}>
            <h2 className="mb-4">Changelog</h2>
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "center",
                    width: "100%"
                }}
            >
                <Card
                    className="mb-3 shadow"
                    style={{
                        width: "100%",
                        maxWidth: 1220
                    }}
                >
                    <Card.Body style={{padding: "1.5rem"}}>
                        <ul style={{marginBottom: 0, paddingLeft: "1.25rem"}}>
                            {displayedUpdates.map((update, idx) => (
                                <li
                                    key={idx}
                                    style={{
                                        marginBottom:
                                            idx === displayedUpdates.length - 1 &&
                                            !(!expanded && updatesData.length > N_BEFORE_HIDE)
                                                ? 0
                                                : "0.75rem",
                                        lineHeight: 1.6
                                    }}
                                >
                                    {update}
                                </li>
                            ))}
                        </ul>
                        {updatesData.length > N_BEFORE_HIDE && (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    marginTop: "0.75rem"
                                }}
                            >
                                <Button
                                    variant="link"
                                    onClick={() => setExpanded(!expanded)}
                                    style={{
                                        padding: 0,
                                        textDecoration: "none",
                                        fontWeight: 600,
                                        fontSize: "0.95rem"
                                    }}
                                >
                                    {expanded ? "Show less ▲" : "View all ▼"}
                                </Button>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </div>
        </Container>
    );
};

export default Updates;
