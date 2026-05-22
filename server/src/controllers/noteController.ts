import { Response } from 'express';
import Note from '../models/Note';
import { getSession } from '../neo4j';
import { AuthRequest } from '../middleware/auth';

// Regex to find [[wiki-links]]
const wikiLinkRegex = /\[\[(.*?)\]\]/g;

export const createNote = async (req: AuthRequest, res: Response) => {
  try {
    const { _id, title, content, tags, parentId, icon, properties } = req.body;
    const note = new Note({
      _id,
      userId: req.userId,
      title,
      content,
      tags,
      parentId,
      icon,
      properties,
    });
    await note.save();

    // Sync with Neo4j
    const session = getSession();
    try {
      await session.run(
        `MERGE (n:Note {id: $id}) SET n.title = $title, n.userId = $userId`,
        { id: note._id.toString(), title: note.title, userId: req.userId }
      );
    } finally {
      await session.close();
    }

    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create note' });
  }
};

export const getNotes = async (req: AuthRequest, res: Response) => {
  try {
    const notes = await Note.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

export const getNoteById = async (req: AuthRequest, res: Response) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch note' });
  }
};

export const updateNote = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, tags, parentId, icon, properties } = req.body;
    
    let note = await Note.findById(req.params.id);

    if (note) {
      if (note.userId && note.userId !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized to update this note' });
      }
      note = await Note.findByIdAndUpdate(
        req.params.id,
        { userId: req.userId, title, content, tags, parentId, icon, properties },
        { new: true }
      );
    } else {
      note = new Note({
        _id: req.params.id,
        userId: req.userId,
        title,
        content,
        tags,
        parentId,
        icon,
        properties
      });
      await note.save();
    }

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Process wiki-links
    const linkedTitles = [];
    let match;
    while ((match = wikiLinkRegex.exec(content || '')) !== null) {
      linkedTitles.push(match[1]);
    }

    // Sync with Neo4j
    const session = getSession();
    try {
      // 1. Update node
      await session.run(
        `MERGE (n:Note {id: $id}) SET n.title = $title, n.userId = $userId`,
        { id: note._id.toString(), title: note.title, userId: req.userId }
      );
      
      // 2. Clear old links
      await session.run(
        `MATCH (n:Note {id: $id})-[r:LINKS_TO]->() DELETE r`,
        { id: note._id.toString() }
      );

      // 3. Create new links based on titles (assuming title matches for now)
      for (const linkedTitle of linkedTitles) {
        await session.run(
          `
          MATCH (n1:Note {id: $id, userId: $userId})
          MERGE (n2:Note {title: $linkedTitle, userId: $userId})
          ON CREATE SET n2.id = randomUUID()
          MERGE (n1)-[:LINKS_TO]->(n2)
          `,
          { id: note._id.toString(), linkedTitle, userId: req.userId }
        );
      }
    } finally {
      await session.close();
    }

    res.json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update note' });
  }
};

export const deleteNote = async (req: AuthRequest, res: Response) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Sync with Neo4j
    const session = getSession();
    try {
      await session.run(
        `MATCH (n:Note {id: $id}) DETACH DELETE n`,
        { id: req.params.id }
      );
    } finally {
      await session.close();
    }

    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
};
