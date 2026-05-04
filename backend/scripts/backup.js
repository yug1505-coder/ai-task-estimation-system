#!/usr/bin/env node

// backend/scripts/backup.js - Data Backup Script

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Task = require('../models/Task');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Create backups directory if it doesn't exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function createBackup() {
  try {
    console.log('Starting database backup...');

    // Connect to MongoDB if needed
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/task-estimation');
    }

    // Export users
    const users = await User.find({});
    const tasks = await Task.find({});

    const backup = {
      createdAt: new Date().toISOString(),
      users: users.map(u => u.toObject()),
      tasks: tasks.map(t => t.toObject())
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.json`);

    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`✓ Backup created: ${backupFile}`);
    console.log(`  Users: ${users.length}, Tasks: ${tasks.length}`);

    // Keep only last 10 backups
    const backups = fs.readdirSync(BACKUP_DIR).sort().reverse();
    if (backups.length > 10) {
      const toDelete = backups.slice(10);
      toDelete.forEach(file => {
        fs.unlinkSync(path.join(BACKUP_DIR, file));
        console.log(`  Deleted old backup: ${file}`);
      });
    }

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
}

createBackup();
