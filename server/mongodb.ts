import mongoose, { Schema } from 'mongoose';

const NovaTaskSchema = new Schema({
  docId: { type: String, default: 'main_store', unique: true },
  users: { type: [Schema.Types.Mixed], default: [] },
  tasks: { type: [Schema.Types.Mixed], default: [] },
  completedTasks: { type: [Schema.Types.Mixed], default: [] },
  taskSubmissions: { type: [Schema.Types.Mixed], default: [] },
  withdrawals: { type: [Schema.Types.Mixed], default: [] },
  transactions: { type: [Schema.Types.Mixed], default: [] },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const NovaTaskModel = mongoose.models.NovaTaskStore || 
  mongoose.model('NovaTaskStore', NovaTaskSchema);


mongoose.set('bufferCommands', false);

let isConnected = false;
let lastConnectAttempt = 0;
const CONNECT_COOLDOWN_MS = 60000; // Retry at most once per minute if disconnected

export async function connectToMongoDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.trim() === '' || uri.includes('<password>') || uri.includes('YOUR_MONGODB')) {
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return true;
  }

  // Prevent spamming failing connection attempts on every request
  const now = Date.now();
  if (!isConnected && lastConnectAttempt && (now - lastConnectAttempt < CONNECT_COOLDOWN_MS)) {
    return false;
  }

  lastConnectAttempt = now;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    console.log('[MongoDB] Successfully connected to MongoDB Atlas!');
    return true;
  } catch (err: any) {
    console.warn('[MongoDB] Database offline/unreachable, using local JSON storage:', err.message || err);
    isConnected = false;
    return false;
  }
}

export async function loadFromMongoDB(): Promise<any | null> {
  try {
    if (!isConnected && !(await connectToMongoDB())) return null;
    const doc = await NovaTaskModel.findOne({ docId: 'main_store' } as any).lean() as any;
    if (doc) {
      return {
        users: doc.users || [],
        tasks: doc.tasks || [],
        completedTasks: doc.completedTasks || [],
        taskSubmissions: doc.taskSubmissions || [],
        withdrawals: doc.withdrawals || [],
        transactions: doc.transactions || []
      };
    }
  } catch (err: any) {
    console.error('[MongoDB] Error loading state:', err.message);
  }
  return null;
}

export async function saveToMongoDB(data: any) {
  try {
    if (!isConnected && !(await connectToMongoDB())) return;
    await NovaTaskModel.findOneAndUpdate(
      { docId: 'main_store' } as any,
      {
        users: data.users || [],
        tasks: data.tasks || [],
        completedTasks: data.completedTasks || [],
        taskSubmissions: data.taskSubmissions || [],
        withdrawals: data.withdrawals || [],
        transactions: data.transactions || [],
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
  } catch (err: any) {
    console.error('[MongoDB] Error saving state:', err.message);
  }
}

