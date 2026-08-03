"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
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
  createStationeryItem,
  createUniformItem,
  deleteBook,
  deleteStationeryItem,
  deleteUniformItem,
  getBooksByClass,
  getClassLevelsBySchool,
  getSchools,
  getStationeryItemsByClass,
  getUniformItemsByClass,
  updateBook,
  updateStationeryItem,
  updateUniformItem,
} from "@/lib/data-source";
import type { Book, ClassLevel, StationeryItem, UniformItem } from "@/types";

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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const priceNum = Number(price);
    if (!title.trim() || !subject.trim() || !priceNum) return;
    if (editing) {
      await updateBook(editing.id, {
        title: title.trim(),
        subject: subject.trim(),
        price: priceNum,
      });
    } else {
      await createBook({
        schoolId,
        classLevelId,
        title: title.trim(),
        subject: subject.trim(),
        price: priceNum,
      });
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
  const [books, setBooks] = useState<Book[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);

  const refresh = useCallback(() => {
    getBooksByClass(schoolId, classLevelId).then(setBooks);
  }, [schoolId, classLevelId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this book from the class list?")) return;
    await deleteBook(id);
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
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(books ?? []).map((book) => (
                <TableRow key={book.id}>
                  <TableCell>{book.title}</TableCell>
                  <TableCell>{book.subject}</TableCell>
                  <TableCell>₹{book.price}</TableCell>
                  <TableCell className="space-x-1 text-right">
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
                      onClick={() => handleDelete(book.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {books !== null && books.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sub">
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
    </Card>
  );
}

// --- Stationery -----------------------------------------------------------

function StationeryForm({
  schoolId,
  classLevelId,
  editing,
  onDone,
}: {
  schoolId: string;
  classLevelId: string;
  editing: StationeryItem | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [quantityLabel, setQuantityLabel] = useState(
    editing?.quantityLabel ?? "",
  );
  const [price, setPrice] = useState(editing ? String(editing.price) : "");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const priceNum = Number(price);
    if (!name.trim() || !quantityLabel.trim() || !priceNum) return;
    if (editing) {
      await updateStationeryItem(editing.id, {
        name: name.trim(),
        quantityLabel: quantityLabel.trim(),
        price: priceNum,
      });
    } else {
      await createStationeryItem({
        schoolId,
        classLevelId,
        name: name.trim(),
        quantityLabel: quantityLabel.trim(),
        price: priceNum,
      });
    }
    onDone();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="stationery-name">Name</Label>
        <Input
          id="stationery-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="stationery-qty">Quantity label</Label>
        <Input
          id="stationery-qty"
          placeholder="e.g. Set of 5"
          value={quantityLabel}
          onChange={(e) => setQuantityLabel(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="stationery-price">Price (₹)</Label>
        <Input
          id="stationery-price"
          type="number"
          min="0"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </div>
      <DialogFooter>
        <Button type="submit">{editing ? "Save Changes" : "Add Item"}</Button>
      </DialogFooter>
    </form>
  );
}

function StationeryDialog({
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
  editing: StationeryItem | null;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Stationery Item" : "Add Stationery Item"}
          </DialogTitle>
        </DialogHeader>
        {open ? (
          <StationeryForm
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

function StationeryManager({
  schoolId,
  classLevelId,
}: {
  schoolId: string;
  classLevelId: string;
}) {
  const [items, setItems] = useState<StationeryItem[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StationeryItem | null>(null);

  const refresh = useCallback(() => {
    getStationeryItemsByClass(schoolId, classLevelId).then(setItems);
  }, [schoolId, classLevelId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this item from the class list?")) return;
    await deleteStationeryItem(id);
    refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Stationery</CardTitle>
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
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.quantityLabel}</TableCell>
                  <TableCell>₹{item.price}</TableCell>
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
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items !== null && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sub">
                    No stationery items for this class yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <StationeryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schoolId={schoolId}
        classLevelId={classLevelId}
        editing={editing}
        onSaved={refresh}
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
  const [basePrice, setBasePrice] = useState(
    editing ? String(editing.sizeOptions[0]?.price ?? "") : "",
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const priceNum = Number(basePrice);
    if (!name.trim() || !priceNum) return;
    if (editing) {
      await updateUniformItem(editing.id, {
        name: name.trim(),
        category,
        description: description.trim(),
        basePrice: priceNum,
      });
    } else {
      await createUniformItem({
        schoolId,
        classLevelId,
        name: name.trim(),
        category,
        description: description.trim(),
        basePrice: priceNum,
      });
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
        <Label htmlFor="uniform-price">Base price (₹, smallest size)</Label>
        <Input
          id="uniform-price"
          type="number"
          min="0"
          value={basePrice}
          onChange={(e) => setBasePrice(e.target.value)}
          required
        />
        <p className="text-xs text-sub">
          Prices for larger sizes are generated automatically, same as the seed
          catalogue.
        </p>
      </div>
      <DialogFooter>
        <Button type="submit">{editing ? "Save Changes" : "Add Item"}</Button>
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
      <DialogContent>
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
  const [items, setItems] = useState<UniformItem[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UniformItem | null>(null);

  const refresh = useCallback(() => {
    getUniformItemsByClass(schoolId, classLevelId).then(setItems);
  }, [schoolId, classLevelId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this item from the class list?")) return;
    await deleteUniformItem(id);
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
                <TableHead>Sizes</TableHead>
                <TableHead>Price range</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(items ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="capitalize">{item.category}</TableCell>
                  <TableCell>{item.sizeOptions.length}</TableCell>
                  <TableCell>
                    ₹{item.sizeOptions[0]?.price} – ₹
                    {item.sizeOptions[item.sizeOptions.length - 1]?.price}
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
                      onClick={() => handleDelete(item.id)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items !== null && items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sub">
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
    </Card>
  );
}

// --- Page ---------------------------------------------------------------

export default function CatalogueManagerPage() {
  const [schoolId, setSchoolId] = useState<string>("");
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [classLevelId, setClassLevelId] = useState<string>("");

  useEffect(() => {
    getSchools().then((schools) => {
      if (schools.length > 0) setSchoolId(schools[0].id);
    });
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    getClassLevelsBySchool(schoolId).then((result) => {
      setClassLevels(result);
      if (result.length > 0) setClassLevelId(result[0].id);
    });
  }, [schoolId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">
          Catalogue Manager
        </h1>
        <p className="text-sm text-sub">
          Manage the fixed book, uniform and stationery lists by class. In Phase
          9 this becomes Payload&apos;s generated <code>/admin</code> collection
          UI — this screen is a temporary stand-in, not a bulk-import tool.
        </p>
      </div>

      <div className="max-w-xs space-y-2">
        <Label>Class</Label>
        <Select value={classLevelId} onValueChange={setClassLevelId}>
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

      {schoolId && classLevelId ? (
        <div className="space-y-6">
          <BooksManager schoolId={schoolId} classLevelId={classLevelId} />
          <UniformManager schoolId={schoolId} classLevelId={classLevelId} />
          <StationeryManager schoolId={schoolId} classLevelId={classLevelId} />
        </div>
      ) : null}
    </div>
  );
}
