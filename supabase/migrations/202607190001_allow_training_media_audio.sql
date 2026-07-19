update storage.buckets
set allowed_mime_types = array['video/mp4', 'image/webp', 'audio/mpeg']
where id = 'training-media';
