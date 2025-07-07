-- SHOW DATABASES
SELECT datname AS database_name
FROM pg_database
WHERE datistemplate = false
ORDER BY datname;

-- DISPLAY ALL TABLES ACROSS ALL SCHEMAS
SELECT 
    table_schema,
    table_name,
    table_type
FROM 
    information_schema.tables
WHERE 
    table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY 
    table_schema, 
    table_name;

Convert userId columns from text to UUID type
ALTER TABLE public."UserMetadata" 
ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;

ALTER TABLE public."Conversation" 
ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;

ALTER TABLE public."Character" 
ALTER COLUMN "userId" TYPE uuid USING "userId"::uuid;


-- Now add the foreign key constraints
ALTER TABLE public."UserMetadata"
ADD CONSTRAINT fk_usermetadata_user FOREIGN KEY ("userId") REFERENCES auth.users(id);

ALTER TABLE public."Conversation"
ADD CONSTRAINT fk_conversation_user FOREIGN KEY ("userId") REFERENCES auth.users(id);

ALTER TABLE public."Character"
ADD CONSTRAINT fk_character_user FOREIGN KEY ("userId") REFERENCES auth.users(id);

-- Create indexes for better performance
CREATE INDEX idx_usermetadata_userid ON public."UserMetadata"("userId");
CREATE INDEX idx_conversation_userid ON public."Conversation"("userId");
CREATE INDEX idx_character_userid ON public."Character"("userId");


Create policy for Conversation table - users can only access their own conversations
CREATE POLICY "Users can access only their own conversations"
ON public."Conversation"
FOR ALL
TO authenticated
USING ("userId" = (select auth.uid()));

Create policy for Message table - users can only access messages from their conversations
CREATE POLICY "Users can access only messages from their conversations"
ON public."Message"
FOR ALL
TO authenticated
USING ("conversationId" IN (
  SELECT id 
  FROM public."Conversation" 
  WHERE "userId" = (select auth.uid())
));

Create index on conversationId to improve RLS policy performance
CREATE INDEX IF NOT EXISTS message_conversation_id_idx 
ON public."Message" ("conversationId");

Create index on userId in Conversation table to improve RLS policy performance
CREATE INDEX IF NOT EXISTS conversation_user_id_idx 
ON public."Conversation" ("userId");