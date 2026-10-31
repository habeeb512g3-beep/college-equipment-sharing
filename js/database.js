(() => {
  const supabase = window.supabaseClient;

  if (!supabase) {
    console.error('CampusShare: Supabase client not initialized.');
    return;
  }

  const allowedTables = [
    'profiles',
    'owner_applications',
    'categories',
    'resources',
    'resource_images',
    'booking_requests',
    'booking_request_items',
    'request_reviews',
    'borrow_records',
    'condition_reports',
    'incidents',
    'incident_updates',
    'notifications',
    'activity_logs'
  ];

  function checkTable(table) {
    if (!allowedTables.includes(table)) {
      throw new Error(`Invalid CampusShare table: ${table}`);
    }
  }

  function applyFilters(query, filters = {}) {
    Object.entries(filters).forEach(([column, value]) => {
      query = value === null
        ? query.is(column, null)
        : query.eq(column, value);
    });

    return query;
  }

  window.CampusDB = {
    // READ records
    async get(table, options = {}) {
      checkTable(table);

      let query = supabase
        .from(table)
        .select(options.columns || '*');

      query = applyFilters(query, options.filters);

      if (options.orderBy) {
        query = query.order(options.orderBy, {
          ascending: options.ascending ?? true
        });
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    async insert(table, records) {
      checkTable(table);

      const { data, error } = await supabase
        .from(table)
        .insert(records)
        .select();

      if (error) throw error;
      return data;
    },
    async update(table, filters, changes) {
      checkTable(table);

      if (!filters || Object.keys(filters).length === 0) {
        throw new Error('Update requires filters.');
      }

      let query = supabase.from(table).update(changes);
      query = applyFilters(query, filters);

      const { data, error } = await query.select();

      if (error) throw error;
      return data;
    },
    async remove(table, filters) {
      checkTable(table);

      if (!filters || Object.keys(filters).length === 0) {
        throw new Error('Delete requires filters.');
      }

      let query = supabase.from(table).delete();
      query = applyFilters(query, filters);

      const { data, error } = await query.select();

      if (error) throw error;
      return data;
    }
  };

  console.log('CampusShare Database Service initialized!');
})();
