/**
 * Theme Service
 * Handles all theme-related database operations
 */

import { supabase } from '../config/supabase.js';

export const themeService = {
    /**
     * Get all themes for the current user
     * @returns {Promise<Array>}
     */
    async getAll() {
        const { data, error } = await supabase
            .from('themes')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    /**
     * Create a new theme
     * @param {Object} themeData - { id, name, color }
     * @returns {Promise<Object>}
     */
    async create(themeData) {
        const { data, error } = await supabase
            .from('themes')
            .insert([themeData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing theme
     * @param {string} id 
     * @param {Object} themeData - { name?, color? }
     * @returns {Promise<Object>}
     */
    async update(id, themeData) {
        const { data, error } = await supabase
            .from('themes')
            .update(themeData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete a theme
     * @param {string} id 
     */
    async delete(id) {
        console.log('Attempting to delete theme:', id);

        // Step 1: Delete all notes associated with this theme (Application-level Cascade)
        // This avoids foreign key constraint violations
        const { error: notesError } = await supabase
            .from('notes')
            .delete()
            .eq('theme_id', id);

        if (notesError) {
            console.error('Error deleting theme notes:', notesError);
            throw notesError;
        }

        // Step 2: Delete the theme itself
        const { error } = await supabase
            .from('themes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase delete theme error:', error);
            console.error('Error details:', error.details, error.message, error.hint);
            throw error;
        }
    }
};
