import {ScanDetails, ScanDetailsSchema, gracefulParse} from "../types";
import {simpleSearch} from "../logic";

import contentJSON from "../dynamic_content.json";

const ScanCard = ({scan: scan}: {scan: ScanDetails}) => {
    return (
        <div style={{border: "1px solid black", padding: 10, marginBottom: 10}}>
            <h3>{scan.sampleName}</h3>
            <p>
                <strong>Author:</strong> {scan.contributors}
            </p>
            <p>
                <strong>Type:</strong> {scan.chemistry}
            </p>
            <a href={scan.zenodoLinks.rawZenodoLinks[0]} target="_blank" rel="noopener noreferrer">
                Read here
            </a>
        </div>
    );
};

export const DynamicContent = ({searchText}: {searchText: string}) => {
    const data: ScanDetails[] = gracefulParse(ScanDetailsSchema, contentJSON);

    return (
        <div style={{width: 700}}>
            <div>
                {data
                    .filter((s) => simpleSearch(searchText.split(" "), s))
                    .map((scan) => (
                        <ScanCard key={scan.sampleID} scan={scan} />
                    ))}
            </div>
            <p>
                <a href="">Go back</a>
            </p>
        </div>
    );
};
