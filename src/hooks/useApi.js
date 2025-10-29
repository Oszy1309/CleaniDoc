// API data fetching hook
import { useState, useEffect } from 'react';
import { apiHelpers } from '../lib/api';

export const useApi = (table, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: result, error: fetchError } = await apiHelpers.fetchData(table, options);

      if (fetchError) {
        setError(fetchError);
      } else {
        setData(result);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (table) {
      fetchData();
    }
  }, [table, JSON.stringify(options)]);

  const refetch = () => fetchData();

  return {
    data,
    loading,
    error,
    refetch,
  };
};

export default useApi;
