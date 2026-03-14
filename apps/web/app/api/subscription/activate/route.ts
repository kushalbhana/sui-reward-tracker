import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectToDatabase, User, Subscription } from "@repo/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { txHash, walletAddress, paidAmount, paidCurrency } = body;

    if (!txHash || !walletAddress || !paidAmount || !paidCurrency) {
      return NextResponse.json(
        { error: "Missing required fields: txHash, walletAddress, paidAmount, paidCurrency" },
        { status: 400 }
      );
    }

    if (!["SUI", "SOL", "USDT"].includes(paidCurrency)) {
      return NextResponse.json(
        { error: "Invalid currency. Must be SUI, SOL, or USDT" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check for duplicate tx hash
    const existingSubscription = await Subscription.findOne({ txHash });
    if (existingSubscription) {
      return NextResponse.json(
        { error: "This transaction has already been used" },
        { status: 409 }
      );
    }

    // Check if user already has an active subscription
    const activeSubscription = await Subscription.findOne({
      userId: user._id,
      status: "active",
      expiresAt: { $gt: new Date() },
    });

    // Calculate expiry: 30 days from now, or extend from current expiry
    const now = new Date();
    const baseDate =
      activeSubscription && activeSubscription.expiresAt > now
        ? activeSubscription.expiresAt
        : now;
    const expiresAt = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    // If extending, mark old subscription as expired
    if (activeSubscription) {
      activeSubscription.status = "expired";
      await activeSubscription.save();
    }

    const subscription = await Subscription.create({
      userId: user._id,
      plan: "pro",
      status: "active",
      txHash,
      walletAddress,
      paidAmount: parseFloat(paidAmount),
      paidCurrency,
      activatedAt: now,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        expiresAt: subscription.expiresAt,
      },
    });
  } catch (error: any) {
    console.error("Subscription activation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
