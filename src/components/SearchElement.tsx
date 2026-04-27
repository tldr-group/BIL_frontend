import { FC } from "react";
import { useNavigate } from "react-router-dom";

type SearchProps = {
  searchText: string;
  setSearchText: (e: string) => void;
};

export const SearchElement: FC<SearchProps> = ({ searchText, setSearchText }) => {
  const navigate = useNavigate();

  const onBrowseAll = () => {
    navigate("search");
  };

  return (
    <div>
      <form role="search">
        <input
          name="search"
          type="search"
          placeholder="Search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <input type="button" value="Browse all!" onClick={onBrowseAll} />
      </form>
    </div>
  );
};
