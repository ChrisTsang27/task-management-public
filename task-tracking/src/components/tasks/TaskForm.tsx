"use client";

import { useState, useEffect, lazy, Suspense } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, FileText, User, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
const RichTextEditor = lazy(() => import('@/components/ui/rich-text-editor'));
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  Task, 
  CreateTaskRequest,
  UpdateTaskRequest,
  TASK_STATUS_LABELS
} from '@/types/tasks';

// Form validation schema
const taskFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.record(z.unknown()).or(z.string()).optional(),
  status: z.enum(['awaiting_approval', 'approved', 'in_progress', 'pending_review', 'rework', 'done', 'blocked', 'on_hold', 'cancelled']),
  assignee_id: z.string().optional(),
  due_date: z.date().optional(),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  onSubmit: (data: CreateTaskRequest | UpdateTaskRequest) => Promise<void>;
  loading?: boolean;
  users?: Array<{ id: string; name: string; email: string }>;
}

export function TaskForm({
  open,
  onOpenChange,
  task,
  onSubmit,
  loading = false,
  users = []
}: TaskFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!task;

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: undefined,
      status: 'awaiting_approval',
      assignee_id: undefined,
      due_date: undefined,
    },
  });

  // Reset form when task changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      if (task) {
        // Editing existing task
        form.reset({
          title: task.title,
          description: task.description_json,
          status: task.status,
          assignee_id: task.assignee_id || '',
          due_date: task.due_date ? new Date(task.due_date) : undefined,
        });

      } else {
        // Creating new task
        form.reset({
          title: '',
          description: undefined,
          status: 'awaiting_approval',
          assignee_id: undefined,
          due_date: undefined,
        });

      }
    }
  }, [open, task, form]);

  const handleSubmit = async (data: TaskFormData) => {
    setIsSubmitting(true);
    try {
      const submitData = {
        title: data.title,
        description_json: data.description,
        status: data.status,
        due_date: data.due_date?.toISOString(),
        assignee_id: data.assignee_id === 'unassigned' || !data.assignee_id ? null : data.assignee_id,
        is_request: false
      };

      if (isEditing) {
        await onSubmit(submitData as UpdateTaskRequest);
      } else {
        await onSubmit(submitData as CreateTaskRequest);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error submitting task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] w-[95vw] bg-slate-900 border-slate-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3 pb-6 border-b border-slate-700">
          <DialogTitle className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
            </div>
            {isEditing ? 'Edit Task' : 'Create New Task'}
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-sm sm:text-base">
            {isEditing ? 'Update the task details below.' : 'Fill in the details to create a new task.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6 py-4 sm:py-6">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-white font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    Title *
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter task title..."
                      className="bg-slate-800/50 border-slate-600 text-white placeholder-slate-400 h-12 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-white font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-400" />
                    Description
                  </FormLabel>
                  <FormControl>
                    <div className="border border-slate-600 rounded-lg bg-slate-800/50 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                      <Suspense fallback={<div className="h-[180px] bg-slate-800/50 rounded-md animate-pulse" />}>
                        <RichTextEditor
                          content={field.value}
                          onChange={field.onChange}
                          placeholder="Enter task description..."
                          className="min-h-[180px]"
                        />
                      </Suspense>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-white font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-yellow-400" />
                    Status
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white h-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-white hover:bg-slate-700">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assignee and Due Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="assignee_id"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-white font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-400" />
                      Assignee
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white h-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all">
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="unassigned" className="text-white hover:bg-slate-700">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center">
                              <User className="w-3 h-3" />
                            </div>
                            Unassigned
                          </div>
                        </SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id} className="text-white hover:bg-slate-700">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              {user.name} ({user.email})
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-white font-medium flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-cyan-400" />
                      Due Date
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700 h-12 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all',
                              !field.value && 'text-slate-400'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-600" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="bg-slate-800 text-white"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>





            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-slate-800/50 border-slate-600 text-white hover:bg-slate-700 h-12 px-6 font-medium transition-all order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-12 px-8 font-medium transition-all shadow-lg order-1 sm:order-2"
              >
                {isSubmitting || loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {isEditing ? 'Update Task' : 'Create Task'}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default TaskForm;