// API utilities and data fetching functions
import { supabase } from './supabase';

export const apiHelpers = {
  // Generic fetch function
  async fetchData(table, options = {}) {
    let query = supabase.from(table).select('*');

    if (options.filter) {
      query = query.filter(options.filter.column, options.filter.operator, options.filter.value);
    }

    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending });
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    return { data, error };
  },

  // Create record
  async createRecord(table, data) {
    const { data: result, error } = await supabase.from(table).insert(data).select();
    return { data: result, error };
  },

  // Update record
  async updateRecord(table, id, data) {
    const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select();
    return { data: result, error };
  },

  // Delete record
  async deleteRecord(table, id) {
    const { error } = await supabase.from(table).delete().eq('id', id);
    return { error };
  },

  // Upload file
  async uploadFile(bucket, path, file) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file);
    return { data, error };
  },

  // Get file URL
  getFileUrl(bucket, path) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};

export default apiHelpers;
