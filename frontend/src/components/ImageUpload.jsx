import { Button, Box, Loader, Avatar, Text } from '@mantine/core';
import { useState } from 'react';
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
      <Button
        variant="default"
        component="label"
        leftSection={loading ? <Loader size={16} /> : <CloudUpload fontSize="small" />}
        disabled={loading}
      >
        {label}
        <input type="file" hidden accept="image/*" onChange={handleChange} />
      </Button>
      {error ? (
        <Text c="red" size="xs" mt={4}>
          {error}
        </Text>
      ) : null}
    </Box>
  );
}

export function LogoPreview({ url, name }) {
  return (
    <Avatar src={url} size={80} radius="md" mb="md">
      {name?.[0]}
    </Avatar>
  );
}
