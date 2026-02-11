import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GovernanceTask } from "@/types/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function Governance() {
  const [tasks, setTasks] = useState<GovernanceTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Task State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    asset_id: "",
    due_date: "",
    priority: "Medium"
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("governance_tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTasks(data as GovernanceTask[]);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
      // toast.error("Failed to load tasks"); // Suppress error for now
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.due_date) {
        toast.error("Please fill in required fields");
        return;
    }

    try {
        const { error } = await supabase.from('governance_tasks').insert({
            description: formData.description,
            asset_id: formData.asset_id || null,
            due_date: new Date(formData.due_date).toISOString(),
            priority: formData.priority,
            status: 'open'
        });

        if (error) throw error;
        toast.success("Task created");
        setIsAddOpen(false);
        setFormData({ description: "", asset_id: "", due_date: "", priority: "Medium" });
        fetchTasks();
    } catch (error) {
        console.error(error);
        toast.error("Failed to create task");
    }
  };

  const handleResolve = async (id: string) => {
    try {
        const { error } = await supabase
            .from('governance_tasks')
            .update({ status: 'resolved' })
            .eq('id', id);

        if (error) throw error;
        toast.success("Task resolved");
        fetchTasks();
    } catch (error) {
        console.error(error);
        toast.error("Failed to resolve task");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'default'; // primary
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const renderTable = (taskList: GovernanceTask[]) => (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Priority</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Asset</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              </TableCell>
            </TableRow>
          ) : taskList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No tasks found.
              </TableCell>
            </TableRow>
          ) : (
            taskList.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Badge variant={getPriorityColor(task.priority) as any}>
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{task.description}</TableCell>
                <TableCell>
                    {task.asset_id ? (
                        <span className="font-mono text-xs">{task.asset_id}</span>
                    ) : (
                        <span className="text-muted-foreground italic">None</span>
                    )}
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(task.due_date), "MMM d, yyyy")}
                    </div>
                </TableCell>
                <TableCell>
                   <Badge variant={task.status === 'resolved' ? "outline" : "secondary"}>
                       {task.status}
                   </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {task.status === 'open' && (
                      <Button variant="ghost" size="sm" onClick={() => handleResolve(task.id)}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                          Resolve
                      </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const openTasks = tasks.filter(t => t.status === 'open');
  const completedTasks = tasks.filter(t => t.status !== 'open');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Governance</h1>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Task
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Governance Task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="description">Task Description</Label>
                        <Textarea
                            id="description"
                            placeholder="e.g. Sign Tax Returns"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="priority">Priority</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={val => setFormData({...formData, priority: val})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="due_date">Due Date</Label>
                            <Input
                                id="due_date"
                                type="date"
                                value={formData.due_date}
                                onChange={e => setFormData({...formData, due_date: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="asset_id">Assigned Asset (Optional)</Label>
                        <Input
                            id="asset_id"
                            placeholder="Building ID or Name"
                            value={formData.asset_id}
                            onChange={e => setFormData({...formData, asset_id: e.target.value})}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button type="submit">Create Task</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="open" className="space-y-4">
        <TabsList>
            <TabsTrigger value="open">Open Tasks ({openTasks.length})</TabsTrigger>
            <TabsTrigger value="completed">Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="open">
            {renderTable(openTasks)}
        </TabsContent>

        <TabsContent value="completed">
            {renderTable(completedTasks)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
