import { Book, BookSchema, gracefulParse } from "../types";
import { simpleSearch } from "../logic";

import contentJSON from "../dynamic_content.json";

const BookCard = ({ book }: { book: Book }) => {
  return (
    <div style={{ border: "1px solid black", padding: 10, marginBottom: 10 }}>
      <h3>{book.name}</h3>
      <p>
        <strong>Author:</strong> {book.author}
      </p>
      <p>
        <strong>Year:</strong> {book.year}
      </p>
      <p>
        <strong>Type:</strong> {book.type}
      </p>
      <a href={book.url} target="_blank" rel="noopener noreferrer">
        Read here
      </a>
    </div>
  );
};

export const DynamicContent = ({ searchText }: { searchText: string }) => {
  const data: Book[] = gracefulParse(BookSchema, contentJSON);

  return (
    <div style={{ width: 700 }}>
      <div>
        {data
          .filter((b) => simpleSearch(searchText.split(" "), b))
          .map((book) => (
            <BookCard key={book.name} book={book} />
          ))}
      </div>
      <p>
        <a href="">Go back</a>
      </p>
    </div>
  );
};
