export function paginate(query, { page = 1, limit = 10 }) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  return query.skip(skip).limit(Math.max(1, limit));
}
