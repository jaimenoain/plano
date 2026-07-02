import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  Input,
  Button,
} from 'plano';

const wrap: React.CSSProperties = { width: 360 };

export const Default = () => {
  const form = useForm({ defaultValues: { name: '', year: '' } });
  return (
    <Form {...form}>
      <form style={wrap} onSubmit={(e) => e.preventDefault()}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Building name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Villa Saarinen" {...field} />
              </FormControl>
              <FormDescription>The name used across the public archive.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div style={{ marginTop: 16 }}>
          <Button type="submit" size="sm">Save building</Button>
        </div>
      </form>
    </Form>
  );
};

export const WithError = () => {
  const form = useForm({
    defaultValues: { year: '19x2' },
    mode: 'onChange',
  });
  useEffect(() => {
    form.setError('year', { message: 'Enter a four-digit year, e.g. 1962.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Form {...form}>
      <form style={wrap} onSubmit={(e) => e.preventDefault()}>
        <FormField
          control={form.control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year completed</FormLabel>
              <FormControl>
                <Input placeholder="1962" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};
