"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createBook,
  createUniformItem,
  deleteBook,
  deleteUniformItem,
  getBooksByClass,
  getUniformItemsByClass,
  updateBook,
  updateUniformItem,
} from "@/lib/data-source";
import { BookContentsDialog } from "./_components/book-contents-dialog";
import { NewAdmissionSection } from "./_components/new-admission-section";
import { useClassLevels, useConsoleSchoolId } from "@/lib/hooks/console-data";
import type {
  AcademicLanguage,
  Book,
  Elective,
  Stream,
  UniformItem,
  UniformSizeOption,
} from "@/types";

const NONE_VALUE = "__none__";

const LANGUAGE_OPTIONS: { value: AcademicLanguage; label: string }[] = [
  { value: "hindi", label: "Hindi" },
  { value: "telugu", label: "Telugu" },
];
const STREAM_OPTIONS: { value: Stream; label: string }[] = [
  { value: "science", label: "Science" },
  { value: "economics", label: "Economics" },
];
const ELECTIVE_OPTIONS: { value: Elective; label: string }[] = [
  { value: "ena", label: "ENA" },
  { value: "homeScience", label: "Home Science" },
  { value: "roboticsAI", label: "Robotics & AI" },
];

// --- Books --------------------------------------------------------------

function BookForm({
  schoolId,
  classLevelId,
  editing,
  onDone,
}: {
  schoolId: string;
  classLevelId: string;
  editing: Book | null;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [subject, setSubject] = useState(editing?.subject ?? "");
  const [price, setPrice] = useState(editing ? String(editing.price) : "");
  const [language, setLanguage] = useState<AcademicLanguage | "">(editing?.language ?? "");
  const [stream, setStream] = useState<Stream | "">(editing?.stream ?? "");
  const [elective, setElective] = useState<Elective | "">(editing?.elective ?? "");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const priceNum = Number(price);
    if (!title.trim() || !subject.trim() || !priceNum) return;
    if (editing) {
      await updateBook(editing.id, {
        title: title.trim(),
        subject: subject.trim(),
        price: priceNum,
        language: language || undefined,
        stream: stream || undefined,
        elective: elective || undefined,
      });
      toast.success("Book updated");
    } else {
      await createBook({
        schoolId,
        classLevelId,
        title: title.trim(),
        subject: subject.trim(),
        price: priceNum,
        language: language || undefined,
        stream: stream || undefined,
        elective: elective || undefined,
      });
      toast.success("Book added");
    }
    onDone();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="book-title">Title</Label>
        <Input
          id="book-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="book-subject">Subject</Label>
        <Input
          id="book-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>2nd Language</Label>
          <Select
            value={language || NONE_VALUE}
            onValueChange={(v) => setLanguage(v === NONE_VALUE ? "" : (v as AcademicLanguage))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>None</SelectItem>
              {LANGUAGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Specialization 1</Label>
          <Select
            value={stream || NONE_VALUE}
            onValueChange={(v) => setStream(v === NONE_VALUE ? "" : (v as Stream))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>None</SelectItem>
              {STREAM_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Specialization 2</Label>
          <Select
            value={elective || NONE_VALUE}
            onValueChange={(v) => setElective(v === NONE_VALUE ? "" : (v as Elective))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>None</SelectItem>
              {ELECTIVE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="book-price">Price (₹)</Label>
        <Input
          id="book-price"
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </div>
      <DialogFooter>
        <Button type="submit">{editing ? "Save Changes" : "Add Book"}</Button>
      </DialogFooter>
    </form>
  );
}

function BookDialog({
  open,
  onOpenChange,
  schoolId,
  classLevelId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  classLevelId: string;
  editing: Book | null;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Book" : "Add Book"}</DialogTitle>
        </DialogHeader>
        {open ? (
          <BookForm
            key={editing?.id ?? "new"}
            schoolId={schoolId}
            classLevelId={classLevelId}
            editing={editing}
            onDone={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function BooksManager({
  schoolId,
  classLevelId,
}: {
  schoolId: string;
  classLevelId: string;
}) {
  const { data: booksData, mutate: refresh } = useSWR(
    ["console:books", schoolId, classLevelId],
    () => getBooksByClass(schoolId, classLevelId),
  );
  const books = booksData ?? null;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [contentsTarget, setContentsTarget] = useState<Book | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteBook(deleteTarget.id);
    setDeleteTarget(null);
    toast.success("Book deleted");
    refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Books</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Add Book
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>2nd Language</TableHead>
                <TableHead>Specialization 1</TableHead>
                <TableHead>Specialization 2</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(books ?? []).map((book) => (
                <TableRow key={book.id}>
                  <TableCell>{book.title}</TableCell>
                  <TableCell>{book.subject}</TableCell>
                  <TableCell className="capitalize">{book.language ?? "—"}</TableCell>
                  <TableCell className="capitalize">{book.stream ?? "—"}</TableCell>
                  <TableCell>
                    {book.elective === "roboticsAI"
                      ? "Robotics & AI"
                      : book.elective === "homeScience"
                        ? "Home Science"
                        : book.elective === "ena"
                          ? "ENA"
                          : "—"}
                  </TableCell>
                  <TableCell>₹{book.price}</TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setContentsTarget(book)}>
                      Items ({book.contents?.length ?? 0})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(book);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(book)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {books !== null && books.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sub">
                    No books for this class yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <BookDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolId={schoolId}
        classLevelId={classLevelId}
        editing={editing}
        onSaved={refresh}
      />
      <BookContentsDialog
        book={contentsTarget}
        open={contentsTarget !== null}
        onOpenChange={(open) => !open && setContentsTarget(null)}
        onSaved={refresh}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this book?"
        description={`"${deleteTarget?.title}" will be removed from this class's book list. This can't be undone.`}
        onConfirm={handleDelete}
      />
    </Card>
  );
}

// --- Uniform & Kit ----------------------------------------------------------

function UniformForm({
  schoolId,
  classLevelId,
  editing,
  onDone,
}: {
  schoolId: string;
  classLevelId: string;
  editing: UniformItem | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [category, setCategory] = useState<"uniform" | "kit">(
    editing?.category ?? "uniform",
  );
  const [description, setDescription] = useState(editing?.description ?? "");
  const [sizeRows, setSizeRows] = useState<UniformSizeOption[]>(
    editing?.sizeOptions.length ? editing.sizeOptions : [{ size: "Standard", price: 0 }],
  );
  const [gender, setGender] = useState<"male" | "female" | "">(editing?.gender ?? "");

  function updateSizeRow(index: number, patch: Partial<UniformSizeOption>) {
    setSizeRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  const cleanSizeRows = sizeRows
    .map((row) => ({ size: row.size.trim(), price: Number(row.price) }))
    .filter((row) => row.size && row.price > 0);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || cleanSizeRows.length === 0) return;
    if (editing) {
      await updateUniformItem(editing.id, {
        name: name.trim(),
        category,
        description: description.trim(),
        sizeOptions: cleanSizeRows,
        gender: gender || undefined,
      });
      toast.success("Uniform item updated");
    } else {
      await createUniformItem({
        schoolId,
        classLevelId,
        name: name.trim(),
        category,
        description: description.trim(),
        sizeOptions: cleanSizeRows,
        gender: gender || undefined,
      });
      toast.success("Uniform item added");
    }
    onDone();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="uniform-name">Name</Label>
        <Input
          id="uniform-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Category</Label>
        <Select
          value={category}
          onValueChange={(v) => setCategory(v as "uniform" | "kit")}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="uniform">Uniform</SelectItem>
            <SelectItem value="kit">Kit</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="uniform-description">Description</Label>
        <Input
          id="uniform-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Gender</Label>
        <Select
          value={gender || NONE_VALUE}
          onValueChange={(v) => setGender(v === NONE_VALUE ? "" : (v as "male" | "female"))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Unisex</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Sizes &amp; prices</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setSizeRows((rows) => [...rows, { size: "", price: 0 }])}
          >
            <Plus className="size-4" />
            Add Size
          </Button>
        </div>
        <p className="text-xs text-sub">
          Add one row per size a student can pick — e.g. &quot;Standard&quot; for a
          one-size item, or &quot;S&quot;, &quot;M&quot;, &quot;L&quot; with their own
          prices. At least one size is required.
        </p>
        <div className="space-y-2">
          {sizeRows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Size, e.g. M"
                value={row.size}
                onChange={(e) => updateSizeRow(index, { size: e.target.value })}
                className="flex-1"
              />
              <Input
                type="number"
                min="0"
                placeholder="Price (₹)"
                value={row.price || ""}
                onChange={(e) => updateSizeRow(index, { price: Number(e.target.value) })}
                className="w-28"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove size"
                disabled={sizeRows.length === 1}
                onClick={() => setSizeRows((rows) => rows.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={cleanSizeRows.length === 0}>
          {editing ? "Save Changes" : "Add Item"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function UniformDialog({
  open,
  onOpenChange,
  schoolId,
  classLevelId,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  classLevelId: string;
  editing: UniformItem | null;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Uniform Item" : "Add Uniform Item"}
          </DialogTitle>
        </DialogHeader>
        {open ? (
          <UniformForm
            key={editing?.id ?? "new"}
            schoolId={schoolId}
            classLevelId={classLevelId}
            editing={editing}
            onDone={() => {
              onOpenChange(false);
              onSaved();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function UniformManager({
  schoolId,
  classLevelId,
}: {
  schoolId: string;
  classLevelId: string;
}) {
  const { data: itemsData, mutate: refresh } = useSWR(
    ["console:uniform", schoolId, classLevelId],
    () => getUniformItemsByClass(schoolId, classLevelId),
  );
  const items = itemsData ?? null;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UniformItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UniformItem | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteUniformItem(deleteTarget.id);
    setDeleteTarget(null);
    toast.success("Uniform item deleted");
    refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Uniform &amp; Kit</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          Add Item
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Sizes</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="capitalize">{item.category}</TableCell>
                  <TableCell className="capitalize">{item.gender ?? "Unisex"}</TableCell>
                  <TableCell>{item.sizeOptions.map((o) => o.size).join(", ") || "—"}</TableCell>
                  <TableCell>
                    {(() => {
                      const prices = item.sizeOptions.map((o) => o.price);
                      const min = Math.min(...prices);
                      const max = Math.max(...prices);
                      return min === max ? `₹${min}` : `₹${min} – ₹${max}`;
                    })()}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(item);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(item)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items !== null && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sub">
                    No uniform/kit items for this class yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <UniformDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolId={schoolId}
        classLevelId={classLevelId}
        editing={editing}
        onSaved={refresh}
      />
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this item?"
        description={`"${deleteTarget?.name}" will be removed from this class's uniform & kit list. This can't be undone.`}
        onConfirm={handleDelete}
      />
    </Card>
  );
}

// --- Page ---------------------------------------------------------------

export default function CatalogueManagerPage() {
  const schoolId = useConsoleSchoolId();
  const { classLevels } = useClassLevels(schoolId);
  const [classLevelId, setClassLevelId] = useState<string>("");
  const effectiveClassLevelId = classLevelId || classLevels[0]?.id || "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">
          Catalogue Manager
        </h1>
        <p className="text-sm text-sub">
          Manage the fixed book and uniform lists by class. In Phase
          9 this becomes Payload&apos;s generated <code>/admin</code> collection
          UI — this screen is a temporary stand-in, not a bulk-import tool.
        </p>
      </div>

      <div className="max-w-xs space-y-2">
        <Label>Class</Label>
        <Select value={effectiveClassLevelId} onValueChange={setClassLevelId}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {classLevels.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {schoolId && effectiveClassLevelId ? (
        <div className="space-y-6">
          <BooksManager schoolId={schoolId} classLevelId={effectiveClassLevelId} />
          <UniformManager schoolId={schoolId} classLevelId={effectiveClassLevelId} />
        </div>
      ) : null}

      {schoolId ? <NewAdmissionSection schoolId={schoolId} /> : null}
    </div>
  );
}
