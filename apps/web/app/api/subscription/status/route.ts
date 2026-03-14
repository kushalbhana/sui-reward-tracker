import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectToDatabase, User, Subscription } from "@repo/db";

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ plan: "free", subscription: null });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ plan: "free", subscription: null });
    }

    const activeSubscription = await Subscription.findOne({
      userId: user._id,
      status: "active",
      expiresAt: { $gt: new Date() },
    }).sort({ expiresAt: -1 });

    if (activeSubscription) {
      return NextResponse.json({
        plan: "pro",
        subscription: {
          id: activeSubscription._id,
          status: activeSubscription.status,
          expiresAt: activeSubscription.expiresAt,
          activatedAt: activeSubscription.activatedAt,
        },
      });
    }

    return NextResponse.json({ plan: "free", subscription: null });
  } catch (error: any) {
    console.error("Subscription status error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
