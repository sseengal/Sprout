// Supabase Edge Function for Razorpay integration
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";
import { createHmac } from "https://deno.land/std@0.177.0/crypto/mod.ts";

// Environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") || "";
const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") || "";

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper to verify Razorpay signature
function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const payload = orderId + "|" + paymentId;
    const expectedSignature = createHmac("sha256", razorpayKeySecret)
      .update(payload)
      .digest("hex");
    
    return expectedSignature === signature;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

// Helper to create a Razorpay order
async function createOrder(
  amount: number,
  currency: string,
  receipt: string,
  notes: Record<string, string>
) {
  const url = "https://api.razorpay.com/v1/orders";
  const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amount * 100, // Razorpay expects amount in paise
        currency,
        receipt,
        notes,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error("Razorpay order creation failed:", error);
      throw new Error(`Failed to create order: ${error.error?.description || "Unknown error"}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    throw error;
  }
}

// Main handler
serve(async (req) => {
  // Handle CORS for preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();
    
    // Create a new order
    if (path === "create-order" && req.method === "POST") {
      const { user_id, plan_id, plan_name, amount, currency, interval } = await req.json();
      
      // Validate required parameters
      if (!user_id || !plan_id || !amount || !currency) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Create a receipt ID
      const receipt = `receipt_${Date.now()}_${user_id.substring(0, 8)}`;
      
      // Create order in Razorpay
      const order = await createOrder(
        amount,
        currency,
        receipt,
        {
          user_id,
          plan_id,
          plan_name,
          interval: interval || "month",
        }
      );
      
      // Store order details in database
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .insert({
          user_id,
          razorpay_order_id: order.id,
          amount,
          currency,
          status: "created",
          description: `Payment for ${plan_name}`,
        })
        .select()
        .single();
      
      if (paymentError) {
        console.error("Error storing payment:", paymentError);
        throw paymentError;
      }
      
      return new Response(
        JSON.stringify({
          id: order.id,
          amount: order.amount / 100,
          currency: order.currency,
          key_id: razorpayKeyId,
          payment_id: paymentData.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Verify payment
    if (path === "verify-payment" && req.method === "POST") {
      const { 
        razorpay_payment_id, 
        razorpay_order_id, 
        razorpay_signature,
        user_id,
        plan_id,
        plan_name,
        amount,
        currency,
        interval,
        interval_count
      } = await req.json();
      
      // Validate required parameters
      if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !user_id) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Verify signature
      const isValid = verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );
      
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Invalid payment signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Calculate subscription end date
      const now = new Date();
      let endDate = new Date(now);
      if (interval === "month") {
        endDate.setMonth(now.getMonth() + (interval_count || 1));
      } else if (interval === "year") {
        endDate.setFullYear(now.getFullYear() + (interval_count || 1));
      }
      
      // Begin transaction
      const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .insert({
          user_id,
          status: "active",
          plan_id,
          plan_name,
          amount,
          currency,
          interval,
          interval_count: interval_count || 1,
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString(),
        })
        .select()
        .single();
      
      if (subscriptionError) {
        console.error("Error creating subscription:", subscriptionError);
        throw subscriptionError;
      }
      
      // Update payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .update({
          subscription_id: subscription.id,
          razorpay_payment_id,
          razorpay_signature,
          status: "captured",
        })
        .eq("razorpay_order_id", razorpay_order_id);
      
      if (paymentError) {
        console.error("Error updating payment:", paymentError);
        throw paymentError;
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          subscription_id: subscription.id,
          status: "active",
          end_date: endDate.toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get subscription status
    if (path === "subscription-status" && req.method === "GET") {
      const userId = url.searchParams.get("user_id");
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Missing user_id parameter" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== "PGRST116") { // PGRST116 is "no rows returned" error
        console.error("Error fetching subscription:", error);
        throw error;
      }
      
      return new Response(
        JSON.stringify({
          has_active_subscription: !!data,
          subscription: data || null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Endpoint not found
    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
