import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

setGlobalOptions({maxInstances: 10, region: "us-central1"});

admin.initializeApp();

/**
 * Callable function: creates a Firebase Auth user + Firestore profile
 * and sends a password-reset link so the invited user can set their password.
 *
 * Only callable by authenticated admins / superAdmins.
 */
export const inviteUser = onCall({cors: true}, async (request) => {
  // Require caller to be authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }

  // Verify caller is admin or superAdmin
  const callerSnap = await admin
    .firestore()
    .collection("users")
    .doc(request.auth.uid)
    .get();

  if (!callerSnap.exists) {
    throw new HttpsError("permission-denied", "Caller profile not found.");
  }

  const callerRole = callerSnap.data()?.role as string;
  if (callerRole !== "admin" && callerRole !== "superAdmin") {
    throw new HttpsError("permission-denied", "Only admins can invite users.");
  }

  const {email, displayName, role} = request.data as {
    email: string;
    displayName: string;
    role: string;
  };

  if (!email || !displayName || !role) {
    throw new HttpsError(
      "invalid-argument",
      "email, displayName, and role are required.",
    );
  }

  // Check if a user with this email already exists in Firestore
  const existing = await admin
    .firestore()
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new HttpsError(
      "already-exists",
      "A user with this email already exists.",
    );
  }

  // Create the Firebase Auth account
  const userRecord = await admin.auth().createUser({
    email,
    displayName,
    emailVerified: false,
  });

  // Write the Firestore profile with the real UID
  await admin.firestore().collection("users").doc(userRecord.uid).set({
    uid: userRecord.uid,
    email,
    displayName,
    role,
    isActive: false,
    permissions: [],
  });

  // Send a password reset link so the user can set their password
  try {
    const resetLink = await admin.auth().generatePasswordResetLink(email);

    // If RESEND_API_KEY is configured, send via Resend; otherwise log the link
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const {Resend} = await import("resend");
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: process.env.INVITE_FROM_EMAIL ?? "noreply@techtrack.app",
        to: email,
        subject: "You've been invited to TechTrack",
        html: `
          <p>Hi ${displayName},</p>
          <p>You've been added to TechTrack Asset Management. Click below:</p>
          <p><a href="${resetLink}">Set your password</a></p>
          <p>If you didn't expect this email, you can ignore it.</p>
        `,
      });
    } else {
      console.log(
        `[inviteUser] Password reset link for ${email}: ${resetLink}`,
      );
    }
  } catch (emailErr) {
    // Don't fail the whole invite if email sending fails
    console.error("[inviteUser] Failed to send invite email:", emailErr);
  }

  return {uid: userRecord.uid};
});
