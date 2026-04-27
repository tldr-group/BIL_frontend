const flattenObject = (ob: Object, prefix: string | null = null, result: object | null = null) => {
  // From user @tofandel on stackexchange: https://stackoverflow.com/questions/44134212/best-way-to-flatten-js-object-keys-and-values-to-a-single-depth-array
  result = result || {};

  // Preserve empty objects and arrays, they are lost otherwise
  if (prefix && typeof ob === "object" && ob !== null && Object.keys(ob).length === 0) {
    result[prefix] = Array.isArray(ob) ? [] : {};
    return result;
  }

  prefix = prefix ? prefix + "." : "";

  for (const i in ob) {
    if (Object.prototype.hasOwnProperty.call(ob, i)) {
      // Only recurse on true objects and arrays, ignore custom classes like dates
      if (
        typeof ob[i] === "object" &&
        (Array.isArray(ob[i]) || Object.prototype.toString.call(ob[i]) === "[object Object]") &&
        ob[i] !== null
      ) {
        // Recursion on deeper objects
        flattenObject(ob[i], prefix + i, result);
      } else {
        result[prefix + i] = ob[i];
      }
    }
  }
  return result;
};

export const simpleSearch = (terms: string[], data: object): boolean => {
  const matchStr = (term: string, query: string): boolean => {
    const queryClean = query.toString().replace(" ", "").toLowerCase();
    const termClean = term.toString().replace(" ", "").toLowerCase();
    return queryClean.includes(termClean);
  };

  const flatKVs = Object.entries(flattenObject(data));
  let globalResult = true;
  for (let term of terms) {
    const searchValue = term;
    let result = false;
    for (let [k, v] of flatKVs) {
      if (matchStr(searchValue, k)) {
        result = true;
      }
      if (matchStr(searchValue, v)) {
        result = true;
      }
    }
    globalResult = globalResult && result;
  }
  return globalResult;
};
