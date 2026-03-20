import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// This defines what a User looks like in MongoDB
// Think of it as a blueprint / table schema

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,         // removes extra spaces
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,       // no two users can have the same email
      lowercase: true,    // always store as lowercase
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
  },
  {
    timestamps: true, // automatically adds createdAt and updatedAt fields
  }
);

// BEFORE saving a user, hash the password
// This runs automatically every time you do user.save()
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Method to check if a password is correct during login
// We compare the typed password with the stored hashed version
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
