import { useState } from 'react';
import { Button, Box, CircularProgress, Avatar } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import api from '../services/api';

export default function ImageUpload({ onUploaded, label = 'Upload Image', endpoint = '/upload/image' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(endpoint, formData);
      onUploaded?.(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <Box>
      <Button variant="outlined" component="label" startIcon={loading ? <CircularProgress size={18} /> : <CloudUpload />} disabled={loading}>
        {label}
        <input type="file" hidden accept="image/*" onChange={handleChange} />
      </Button>
      {error && <Box sx={{ color: 'error.main', fontSize: 12, mt: 0.5 }}>{error}</Box>}
    </Box>
  );
}

export function LogoPreview({ url, name }) {
  return (
    <Avatar src={url} sx={{ width: 80, height: 80, mb: 2 }}>
      {name?.[0]}
    </Avatar>
  );
}
