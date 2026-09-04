import { Controller } from 'react-hook-form';
import RichTextEditor from './RichTextEditor';

/**
 * react-hook-form wrapper for RichTextEditor.
 */
export default function RHFRichTextEditor({
  control,
  name = 'description',
  rules,
  label = 'Description',
  ...rest
}) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      defaultValue=""
      render={({ field, fieldState }) => (
        <RichTextEditor
          label={label}
          value={field.value || ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          {...rest}
        />
      )}
    />
  );
}
