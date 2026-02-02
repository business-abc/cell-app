/**
 * Note Service
 * Handles all note-related database operations
 */

import { supabase } from '../config/supabase.js';

export const noteService = {
    /**
     * Get all notes for a theme
     * @param {string} themeId 
     * @returns {Promise<Array>}
     */
    async getByTheme(themeId) {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('theme_id', themeId)
            .order('date_display', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    /**
     * Create a new note
     * @param {Object} noteData - { title, content, theme_id, date_display, user_id, attachment_url?, attachment_name? }
     * @returns {Promise<Object>}
     */
    async create(noteData) {
        const { data, error } = await supabase
            .from('notes')
            .insert([noteData])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update an existing note
     * @param {string} id 
     * @param {Object} noteData 
     */
    async update(id, noteData) {
        console.log('noteService.update calling with:', id, noteData);
        const { data, error } = await supabase
            .from('notes')
            .update(noteData)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Supabase update error:', error);
            throw error;
        }
        console.log('Supabase update result:', data);
        return data;
    },

    /**
     * Delete a note
     * @param {string} id 
     */
    async delete(id) {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Upload an attachment file
     * @param {File} file 
     * @param {string} userId 
     * @returns {Promise<{ url: string, name: string }>}
     */
    async uploadAttachment(file, userId) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('attachments')
            .getPublicUrl(fileName);

        return {
            url: urlData.publicUrl,
            name: file.name
        };
    }
};
