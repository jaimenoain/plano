import { useState, useEffect } from "react";
import { useForm, useFieldArray, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Trash2, Check, Image as ImageIcon, Film, X, Edit2, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const pollSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  type: z.enum(["general", "quiz", "building_selection"]).default("general"),
  status: z.enum(["draft", "published", "open", "closed", "live"]).default("draft"),
  show_results_before_close: z.boolean().default(false),
  questions: z.array(z.object({
    id: z.string().optional(), // For editing
    question_text: z.string().min(1, "Question is required"),
    allow_custom_answer: z.boolean().default(false),

    // New fields for questions
    response_type: z.enum(["text", "building", "image", "person"]).default("text"),
    media_type: z.enum(["image", "video", "building"]).optional().nullable(),
    media_url: z.string().optional().nullable(),
    media_data: z.any().optional().nullable(), // Store JSON object (e.g. Building data)

    options: z.array(z.object({
      id: z.string().optional(), // For editing
      value: z.string(), // Text, or stringified ID/URL
      is_correct: z.boolean().optional(),

      // New fields for options
      content_type: z.enum(["text", "building", "image", "person"]).default("text"),
      media_url: z.string().optional().nullable(),
      building_id: z.string().uuid().optional().nullable()
    }).superRefine((val, ctx) => {
      if (val.content_type === 'text' && val.value.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Option text is required",
          path: ["value"]
        });
      }
    }))
  })).min(1, "At least one question is required")
}).superRefine((data, ctx) => {
    if (data.type === 'quiz') {
        data.questions.forEach((q, qIndex) => {
            const correctCount = q.options.filter(o => o.is_correct).length;
            if (correctCount !== 1) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "A quiz question must have exactly one correct answer",
                    path: ["questions", qIndex, "options"]
                });
            }
        });
    } else {
        // General poll validation
        data.questions.forEach((q, qIndex) => {
            if (q.response_type === 'text' && q.allow_custom_answer) {
                // Allowed to have 0 options (Open Answer)
            } else {
                 if (q.options.length < 1) {
                     ctx.addIssue({
                         code: z.ZodIssueCode.custom,
                         message: "At least one option is required",
                         path: ["questions", qIndex, "options"]
                     });
                 }
            }
        });
    }
});

type PollFormValues = z.infer<typeof pollSchema>;

interface PollDialogProps {
  groupId?: string; // Optional if editing
  userId?: string;  // Optional if editing
  pollToEdit?: any;
  trigger?: React.ReactNode;
  onPollCreated?: () => void;
  onPollDeleted?: () => void;
  pollId?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PollDialog({ groupId, userId, pollToEdit, trigger, onPollCreated, onPollDeleted, pollId, open: controlledOpen, onOpenChange: controlledOnOpenChange }: PollDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [editingResponseType, setEditingResponseType] = useState<Record<number, boolean>>({});
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Transform existing poll data for form
  const defaultValues: Partial<PollFormValues> = pollToEdit ? {
      title: pollToEdit.title,
      description: pollToEdit.description || "",
      type: pollToEdit.type === "film_selection" ? "general" : pollToEdit.type, // Migrate legacy type if needed
      status: pollToEdit.status,
      show_results_before_close: !!pollToEdit.show_results_before_close, // Ensure boolean
      questions: pollToEdit.questions.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          allow_custom_answer: !!q.allow_custom_answer, // Ensure boolean
          response_type: q.response_type || "text",
          media_type: q.media_type,
          media_url: q.media_url,
          media_data: q.media_data,
          options: q.options.map((o: any) => ({
              id: o.id,
              value: o.option_text,
              is_correct: !!o.is_correct, // Ensure boolean
              content_type: o.content_type || "text",
              media_url: o.media_url,
              building_id: o.building_id
          }))
      }))
  } : {
      title: "",
      description: "",
      type: "general",
      status: "draft",
      show_results_before_close: false,
      questions: [
        {
          question_text: "",
          allow_custom_answer: false,
          response_type: "text",
          media_type: null,
          media_url: null,
          media_data: null,
          options: [{ value: "", content_type: "text" }, { value: "", content_type: "text" }]
        }
      ]
  };

  const form = useForm<PollFormValues>({
    resolver: zodResolver(pollSchema),
    defaultValues
  });

  const status = form.watch("status");

  // Reset form when opening for create vs edit or when pollToEdit changes
  useEffect(() => {
      if (open) {
          form.reset(defaultValues);
          setEditingResponseType({});
      }
  }, [open, pollToEdit]);

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion, move: moveQuestion } = useFieldArray({
    control: form.control,
    name: "questions"
  });

  const handleDelete = async () => {
    const currentPollId = pollToEdit?.id || pollId;
    if (!currentPollId) return;

    if (!window.confirm("Are you sure you want to delete this poll? This action cannot be undone.")) return;

    try {
        const { error } = await supabase
            .from("polls")
            .delete()
            .eq("id", currentPollId);

        if (error) throw error;

        await queryClient.invalidateQueries({ queryKey: ["polls"] });
        toast({ title: "Success", description: "Poll deleted" });
        setOpen?.(false);
        onPollDeleted?.();
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const generateSlug = (title: string): string => {
      return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  };

  const onSubmit = async (values: PollFormValues) => {
    try {
      let currentPollId = pollToEdit?.id || pollId;
      const slug = generateSlug(values.title);

      if (pollToEdit || currentPollId) { // Check if we are editing an existing poll passed via props or pollToEdit
          if (!currentPollId && pollToEdit) currentPollId = pollToEdit.id;

          // UPDATE MODE
          if (currentPollId) {
             const { error: updateError } = await supabase
               .from("polls")
               .update({
                   title: values.title,
                   description: values.description,
                   status: values.status,
                   show_results_before_close: values.show_results_before_close,
               })
               .eq("id", currentPollId);

             if (updateError) throw updateError;
          }
      } else {
          // CREATE MODE
          const { count } = await supabase
              .from("polls")
              .select("id", { count: 'exact', head: true })
              .eq("group_id", groupId)
              .eq("slug", slug);

          let finalSlug = slug;
          if (count && count > 0) {
              finalSlug = `${slug}-${Math.floor(Math.random() * 1000)}`;
          }

          const { data: poll, error: pollError } = await supabase
            .from("polls")
            .insert({
              group_id: groupId,
              created_by: userId,
              title: values.title,
              description: values.description,
              status: values.status,
              show_results_before_close: values.show_results_before_close,
              type: values.type,
              slug: finalSlug
            })
            .select()
            .single();

          if (pollError) throw pollError;
          currentPollId = poll.id;
      }

      // Handle Questions Parallel Processing
      await Promise.all(values.questions.map(async (q, index) => {
        let questionId = q.id;

        if (questionId) {
             // Update existing question
             const { error: qError } = await supabase
                .from("poll_questions")
                .update({
                    question_text: q.question_text,
                    allow_custom_answer: q.allow_custom_answer,
                    order_index: index,
                    response_type: q.response_type,
                    media_type: q.media_type,
                    media_url: q.media_url,
                    media_data: q.media_data
                })
                .eq("id", questionId);
             if (qError) throw qError;
        } else {
             // Create new question
             const { data: newQ, error: qError } = await supabase
                .from("poll_questions")
                .insert({
                    poll_id: currentPollId,
                    question_text: q.question_text,
                    order_index: index,
                    allow_custom_answer: q.allow_custom_answer,
                    response_type: q.response_type,
                    media_type: q.media_type,
                    media_url: q.media_url,
                    media_data: q.media_data
                })
                .select()
                .single();
             if (qError) throw qError;
             questionId = newQ.id;
        }

        // Handle Options for this question (Parallel)
        const optionPromises = q.options.map(async (o) => {
             if (o.id) {
                  const { error: optError } = await supabase.from("poll_options").update({
                      option_text: o.value,
                      is_correct: values.type === 'quiz' ? (o.is_correct || false) : null,
                      content_type: o.content_type,
                      media_url: o.media_url,
                      building_id: o.building_id
                  }).eq("id", o.id);

                  if (optError) throw optError;
             } else {
                  const { error: optError } = await supabase.from("poll_options").insert({
                      question_id: questionId,
                      option_text: o.value,
                      is_correct: values.type === 'quiz' ? (o.is_correct || false) : null,
                      content_type: o.content_type,
                      media_url: o.media_url,
                      building_id: o.building_id
                  });

                  if (optError) throw optError;
             }
        });

        await Promise.all(optionPromises);
      }));

      // Force refresh of queries
      await queryClient.invalidateQueries({ queryKey: ["polls"] });

      toast({ title: "Success", description: pollToEdit ? "Poll updated" : "Poll created" });
      setOpen?.(false);
      if (!pollToEdit) form.reset();
      onPollCreated?.();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  const onInvalid = (errors: any) => {
    console.error("Form validation errors:", errors);

    // Recursive function to extract error messages
    const getErrorMessages = (errorObj: any, path: string = ""): string[] => {
        let messages: string[] = [];
        if (errorObj.message && typeof errorObj.message === 'string') {
            messages.push(errorObj.message);
        }
        if (typeof errorObj === 'object') {
            Object.keys(errorObj).forEach(key => {
                // Ignore "type" or "ref" properties often found in error objects
                if (key !== 'type' && key !== 'ref' && key !== 'message') {
                     messages = [...messages, ...getErrorMessages(errorObj[key], path ? `${path}.${key}` : key)];
                }
            });
        }
        return messages;
    };

    const messages = getErrorMessages(errors);
    const uniqueMessages = [...new Set(messages)];

    toast({
        variant: "destructive",
        title: "Validation Error",
        description: (
            <div className="flex flex-col gap-1 mt-1">
                {uniqueMessages.length > 0 ? (
                    uniqueMessages.slice(0, 3).map((msg, i) => (
                        <span key={i} className="text-sm">• {msg}</span>
                    ))
                ) : (
                    <span>Please check the form for errors.</span>
                )}
                {uniqueMessages.length > 3 && <span className="text-xs opacity-70">...and more</span>}
            </div>
        )
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pollToEdit ? "Edit Poll" : "Create New Poll"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6">
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className={pollToEdit ? "sr-only" : ""}>Poll Type</FormLabel>
                  <FormControl>
                    {pollToEdit ? (
                        <div className="font-medium">
                            Poll Type: {field.value === 'quiz' ? 'Quiz' : 'General (vote)'}
                        </div>
                    ) : (
                        <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                        >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="general" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                General (voting)
                                </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="quiz" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                Quiz (one answer is correct)
                                </FormLabel>
                            </FormItem>
                        </RadioGroup>
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Poll Phase</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(val) => field.onChange(val)}
                      value={field.value === 'draft' ? 'open' : field.value} // If draft, default UI to 'open' but keep internal value handled by buttons
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select phase" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="published">Upcoming (Teaser)</SelectItem>
                        <SelectItem value="open">Open (Voting Enabled)</SelectItem>
                        <SelectItem value="live">Live (Real-time)</SelectItem>
                        </SelectContent>
                    </Select>
                  </FormControl>
                  <p className="text-[0.8rem] text-muted-foreground">
                    This determines the state when published. Use "Save as draft" to keep it hidden.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Poll Title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add some context..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {status !== 'live' && (
              <FormField
              control={form.control}
              name="show_results_before_close"
              render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                          <FormLabel className="text-base">
                              Show results
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                              Allow users to see results before closing the poll
                          </p>
                      </div>
                      <FormControl>
                          <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                          />
                      </FormControl>
                  </FormItem>
              )}
              />
            )}

            <div className="space-y-4">
                <h3 className="text-lg font-medium">Questions</h3>

                {questionFields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4 bg-muted/30">
                        <div className="flex justify-between items-center">
                            <h4 className="font-medium">Question {index + 1}</h4>
                            <div className="flex items-center gap-1">
                                {index > 0 && (
                                    <Button type="button" variant="outline" size="icon" onClick={() => moveQuestion(index, index - 1)} title="Move Up">
                                        <ArrowUp className="w-4 h-4" />
                                    </Button>
                                )}
                                {index < questionFields.length - 1 && (
                                    <Button type="button" variant="outline" size="icon" onClick={() => moveQuestion(index, index + 1)} title="Move Down">
                                        <ArrowDown className="w-4 h-4" />
                                    </Button>
                                )}
                                {questionFields.length > 1 && (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(index)}>
                                        <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name={`questions.${index}.question_text`}
                            render={({ field }) => (
                                <FormItem>
                                {/* <FormLabel>Question Text</FormLabel> - Removed as per request */}
                                <FormControl>
                                    <Input placeholder="What would you like to ask?" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Attachments UI */}
                        <QuestionAttachment nestIndex={index} />

                        {/* Response Type UI */}
                        <FormField
                            control={form.control}
                            name={`questions.${index}.response_type`}
                            render={({ field }) => (
                                <FormItem className="space-y-3 pt-2">
                                    <div className="flex flex-row items-center gap-2">
                                        <FormLabel className="mt-0">Response Format</FormLabel>
                                        <FormControl>
                                            {!editingResponseType[index] ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium capitalize">{field.value}</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() => setEditingResponseType(prev => ({ ...prev, [index]: true }))}
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <RadioGroup
                                                onValueChange={(val) => {
                                                    field.onChange(val);
                                                    setEditingResponseType(prev => ({ ...prev, [index]: false }));
                                                    // We should probably reset options here or update their type?
                                                    // For simplicity, let's update content_type for all existing options
                                                    const options = form.getValues(`questions.${index}.options`);
                                                    options.forEach((_, optIdx) => {
                                                        form.setValue(`questions.${index}.options.${optIdx}.content_type`, val as any);
                                                        form.setValue(`questions.${index}.options.${optIdx}.value`, ""); // Clear value as format changed
                                                        form.setValue(`questions.${index}.options.${optIdx}.media_url`, null);
                                                        form.setValue(`questions.${index}.options.${optIdx}.building_id`, null);
                                                    });
                                                }}
                                                defaultValue={field.value}
                                                className="flex space-x-4"
                                            >
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="text" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">Text</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="building" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">Building</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="image" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal">Image</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        )}
                                        </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <QuestionOptions nestIndex={index} />

                        <FormField
                            control={form.control}
                            name={`questions.${index}.allow_custom_answer`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-2 border-t mt-2">
                                <FormControl>
                                    <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <FormLabel className="font-normal">
                                    Allow custom answer
                                </FormLabel>
                                </FormItem>
                            )}
                        />
                    </div>
                ))}

                <div className="flex justify-start">
                    <Button type="button" variant="ghost" size="sm" onClick={() => appendQuestion({ question_text: "", allow_custom_answer: false, response_type: "text", media_type: null, media_url: null, media_data: null, options: [{ value: "", content_type: "text" }, { value: "", content_type: "text" }] })} className="text-muted-foreground hover:text-foreground pl-0">
                        <Plus className="w-4 h-4 mr-2" /> Add Question
                    </Button>
                </div>
            </div>

            <div className="space-y-3 pt-4">
                <Button
                    type="button"
                    className="w-full"
                    onClick={form.handleSubmit((values) => {
                        const statusToSubmit = values.status === 'draft' ? 'open' : values.status;
                        onSubmit({...values, status: statusToSubmit});
                    }, onInvalid)}
                >
                    {pollToEdit ? "Save Changes" : "Publish Poll"}
                </Button>

                <div className="flex justify-between items-center px-1">
                    <Button
                        type="button"
                        variant="link"
                        className="text-muted-foreground h-auto p-0"
                        onClick={form.handleSubmit((values) => onSubmit({...values, status: 'draft'}))}
                    >
                        Save as draft
                    </Button>

                    {pollToEdit && (
                        <Button
                            type="button"
                            variant="link"
                            className="text-destructive hover:text-destructive/90 h-auto p-0"
                            onClick={handleDelete}
                        >
                            Delete Poll
                        </Button>
                    )}
                </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function QuestionAttachment({ nestIndex }: { nestIndex: number }) {
    const { control, watch, setValue } = useFormContext();
    const mediaType = watch(`questions.${nestIndex}.media_type`);
    const mediaUrl = watch(`questions.${nestIndex}.media_url`);
    const mediaData = watch(`questions.${nestIndex}.media_data`);
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        setUploading(true);
        try {
            const { error: uploadError } = await supabase.storage
                .from('poll_images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('poll_images')
                .getPublicUrl(filePath);

            setValue(`questions.${nestIndex}.media_url`, data.publicUrl);
            setValue(`questions.${nestIndex}.media_type`, 'image');
        } catch (error) {
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-2 pt-2">
            <FormLabel className="text-xs uppercase text-muted-foreground font-semibold">Attachment (Optional)</FormLabel>

            {!mediaType ? (
                <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setValue(`questions.${nestIndex}.media_type`, 'image')}>
                        <ImageIcon className="w-4 h-4 mr-2" /> Image
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setValue(`questions.${nestIndex}.media_type`, 'video')}>
                        Video (URL)
                    </Button>
                </div>
            ) : (
                <div className="p-3 border rounded-md relative bg-background">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-6 w-6 z-10"
                        onClick={() => {
                            setValue(`questions.${nestIndex}.media_type`, null);
                            setValue(`questions.${nestIndex}.media_url`, null);
                            setValue(`questions.${nestIndex}.media_data`, null);
                        }}
                    >
                        <X className="w-4 h-4" />
                    </Button>

                    {mediaType === 'image' && (
                        <div className="space-y-2">
                            {mediaUrl ? (
                                <div className="relative h-40 w-full bg-muted rounded-md overflow-hidden">
                                    <img src={mediaUrl} className="h-full w-full object-contain" />
                                </div>
                            ) : (
                                <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                            )}
                            {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
                        </div>
                    )}

                    {mediaType === 'video' && (
                        <div className="space-y-2">
                             <Input
                                placeholder="YouTube URL..."
                                value={mediaUrl || ""}
                                onChange={(e) => setValue(`questions.${nestIndex}.media_url`, e.target.value)}
                             />
                             {mediaUrl && (
                                <div className="space-y-2">
                                   <div className="text-xs text-muted-foreground">Video will be embedded.</div>
                                   {(() => {
                                      const videoId = mediaUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
                                      return videoId ? (
                                         <div className="relative pt-[56.25%] w-full rounded-md overflow-hidden bg-black">
                                            <iframe
                                               className="absolute top-0 left-0 w-full h-full"
                                               src={`https://www.youtube.com/embed/${videoId}`}
                                               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                               allowFullScreen
                                            />
                                         </div>
                                      ) : null;
                                   })()}
                                </div>
                             )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Sub-component for options to handle its own field array
function QuestionOptions({ nestIndex }: { nestIndex: number }) {
    const { control, watch, setValue } = useFormContext();
    const { fields, append, remove } = useFieldArray({
        control,
        name: `questions.${nestIndex}.options`
    });

    const type = watch("type");
    const responseType = watch(`questions.${nestIndex}.response_type`);
    const allowCustomAnswer = watch(`questions.${nestIndex}.allow_custom_answer`);

    // Determine if we can remove options (allow empty if open answer)
    const canRemoveLast = responseType === 'text' && allowCustomAnswer;

    const setCorrectAnswer = (targetIndex: number) => {
        fields.forEach((_, idx) => {
            setValue(`questions.${nestIndex}.options.${idx}.is_correct`, idx === targetIndex);
        });
    };

    return (
        <div className="space-y-3 pl-4 border-l-2 border-muted">
            <h5 className="text-sm font-medium text-muted-foreground">Options ({responseType})</h5>

            <FormField
                control={control}
                name={`questions.${nestIndex}.options`}
                render={({ fieldState }) => (
                    <>
                    {fieldState.error && (
                         <p className="text-sm font-medium text-destructive">{fieldState.error.message}</p>
                    )}
                    </>
                )}
            />

            {fields.map((item, k) => (
                <QuestionOptionItem
                    key={item.id}
                    nestIndex={nestIndex}
                    index={k}
                    remove={() => remove(k)}
                    canRemove={fields.length > 1 || canRemoveLast}
                    setCorrectAnswer={() => setCorrectAnswer(k)}
                />
            ))}

            <Button type="button" variant="ghost" size="sm" onClick={() => append({ value: "", content_type: responseType })} className="mt-2">
                <Plus className="w-3 h-3 mr-1" /> Add Option
            </Button>
        </div>
    );
}

// Extracted component to handle individual option rendering and hook calls safely
function QuestionOptionItem({
    nestIndex,
    index,
    remove,
    canRemove,
    setCorrectAnswer
}: {
    nestIndex: number,
    index: number,
    remove: () => void,
    canRemove: boolean,
    setCorrectAnswer: () => void
}) {
    const { control, watch, setValue } = useFormContext();
    const type = watch("type");
    const responseType = watch(`questions.${nestIndex}.response_type`);
    const [uploading, setUploading] = useState(false);

    // Watch fields specific to this option
    const isCorrect = watch(`questions.${nestIndex}.options.${index}.is_correct`);
    const optionMediaUrl = watch(`questions.${nestIndex}.options.${index}.media_url`);
    const optionBuildingId = watch(`questions.${nestIndex}.options.${index}.building_id`);
    const optionValue = watch(`questions.${nestIndex}.options.${index}.value`);

    const handleOptionFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `option_${fileName}`;

        setUploading(true);
        try {
            const { error: uploadError } = await supabase.storage
                .from('poll_images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('poll_images')
                .getPublicUrl(filePath);

            setValue(`questions.${nestIndex}.options.${index}.media_url`, data.publicUrl);
            setValue(`questions.${nestIndex}.options.${index}.value`, ""); // Empty by default
        } catch (error) {
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex gap-2 items-start">
            {/* Hidden input to ensure content_type is submitted */}
            <input type="hidden" {...control.register(`questions.${nestIndex}.options.${index}.content_type`)} />

            {/* Render Input based on Response Type */}
            <div className="flex-1 space-y-2">
                {responseType === 'text' && (
                    <FormField
                        control={control}
                        name={`questions.${nestIndex}.options.${index}.value`}
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input placeholder={`Option ${index + 1}`} {...field} autoComplete="off" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                {responseType === 'image' && (
                    <div className="flex flex-col gap-2">
                        {optionMediaUrl ? (
                            <div className="relative h-20 w-20 bg-muted rounded overflow-hidden group">
                                    <img src={optionMediaUrl} className="h-full w-full object-cover" />
                                    <Button
                                    type="button" variant="destructive" size="icon" className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setValue(`questions.${nestIndex}.options.${index}.media_url`, null)}
                                >
                                    <X className="w-3 h-3" />
                                </Button>
                            </div>
                        ) : (
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleOptionFileUpload}
                                disabled={uploading}
                            />
                        )}
                        {/* Allow adding text label too? For now, value is placeholder "Image Option" */}
                        <FormField
                            control={control}
                            name={`questions.${nestIndex}.options.${index}.value`}
                            render={({ field }) => (
                                    <Input placeholder="Label (optional)" {...field} className="h-8 text-xs" />
                            )}
                        />
                    </div>
                )}

                {responseType === 'building' && (
                    <div>
                        <p className="text-sm text-muted-foreground">Building selection temporarily unavailable.</p>
                    </div>
                )}
            </div>

                {type === 'quiz' && (
                    <Button
                    type="button"
                    variant={isCorrect ? "default" : "outline"}
                    size="icon"
                    className={isCorrect ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={setCorrectAnswer}
                    title={isCorrect ? "Correct Answer" : "Mark as Correct"}
                    >
                    <Check className="w-4 h-4" />
                    </Button>
                )}

                <Button type="button" variant="ghost" size="icon" onClick={remove} disabled={!canRemove}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
        </div>
    );
}
